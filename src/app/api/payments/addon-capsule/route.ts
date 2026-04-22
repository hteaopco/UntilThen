import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { captureServerEvent } from "@/lib/posthog-server";
import { calculateProration, nextFirstOfMonth, oneYearLater } from "@/lib/proration";
import {
  SQUARE_LOCATION_ID,
  SQUARE_ORDER_TEMPLATE_IDS,
  SQUARE_PLAN_IDS,
  getSquareClient,
  squareIsConfigured,
} from "@/lib/square";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/addon-capsule
 *
 * Increases the subscriber's base-plan slot count by one. Uses
 * the card saved on file during the original subscribe flow —
 * no new card entry required.
 *
 * Flow:
 *   1. Require an ACTIVE Subscription row.
 *   2. Look up the customer's saved card via Square.
 *   3. Monthly: prorate this month's add-on ($0.99 scaled) and
 *      charge the card immediately.
 *      Annual: charge full $6.00 immediately (annual never
 *      prorates per Square constraints + brief).
 *   4. Create a new Square Subscription for the matching add-on
 *      plan variation (aligned on the same cadence as the base).
 *   5. Bump Subscription.addonCapsuleCount by 1 in our DB.
 *
 * Idempotency: the proration charge + add-on Square subscription
 * each use a key keyed on userId + current addonCapsuleCount,
 * so a double-click can't stack two add-ons on one tap.
 */
export async function POST(): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 500 },
    );
  }
  if (!squareIsConfigured()) {
    return NextResponse.json(
      { error: "Payments aren't configured yet." },
      { status: 503 },
    );
  }

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: {
      id: true,
      squareCustomerId: true,
      subscription: {
        select: {
          plan: true,
          status: true,
          addonCapsuleCount: true,
        },
      },
    },
  });
  if (!user || !user.subscription) {
    return NextResponse.json(
      { error: "You need an active subscription before adding slots." },
      { status: 409 },
    );
  }
  if (user.subscription.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Reactivate your subscription before adding slots." },
      { status: 409 },
    );
  }
  if (!user.squareCustomerId) {
    return NextResponse.json(
      {
        error:
          "No card on file. Start a fresh subscription so we can save a card.",
      },
      { status: 409 },
    );
  }

  const plan = user.subscription.plan;
  const addonIndex = user.subscription.addonCapsuleCount; // current, pre-increment

  const square = getSquareClient();
  const now = new Date();

  try {
    // Grab the first card on the customer. In practice the
    // subscribe flow saves exactly one; pick the enabled one
    // so a soft-deleted card from an earlier attempt doesn't
    // trip us.
    const cardsResp = await square.cards.list({
      customerId: user.squareCustomerId,
    });
    const card = (cardsResp as unknown as { data?: { id?: string; enabled?: boolean }[] }).data?.find(
      (c) => c.enabled !== false,
    );
    const cardId = card?.id;
    if (!cardId) {
      return NextResponse.json(
        {
          error:
            "No card on file found. Please re-enter your card details.",
        },
        { status: 409 },
      );
    }

    // 1. Prorated / full upfront charge for this month.
    const { amountTodayCents, nextRenewalAmountCents } = calculateProration(
      { plan, type: "addon" },
      now,
    );

    if (amountTodayCents > 0) {
      const payResp = await square.payments.create({
        idempotencyKey: `addon-charge-${user.id}-${addonIndex}`,
        sourceId: cardId,
        customerId: user.squareCustomerId,
        amountMoney: {
          amount: BigInt(amountTodayCents),
          currency: "USD",
        },
        locationId: SQUARE_LOCATION_ID,
        note:
          plan === "MONTHLY"
            ? "untilThen add-on capsule · prorated"
            : "untilThen add-on capsule · annual",
        referenceId: user.id,
      });
      if (payResp.payment?.status !== "COMPLETED") {
        return NextResponse.json(
          {
            error:
              "Your card on file was declined. Please update your payment method.",
          },
          { status: 402 },
        );
      }
    }

    // 2. Add a matching Square subscription so the add-on keeps
    //    billing on the same cadence as the base going forward.
    const planVariationId =
      plan === "MONTHLY"
        ? SQUARE_PLAN_IDS.MONTHLY_ADDON
        : SQUARE_PLAN_IDS.ANNUAL_ADDON;
    const orderTemplateId =
      plan === "MONTHLY"
        ? SQUARE_ORDER_TEMPLATE_IDS.MONTHLY_ADDON
        : SQUARE_ORDER_TEMPLATE_IDS.ANNUAL_ADDON;
    if (!orderTemplateId) {
      console.error(
        `[payments/addon-capsule] SQUARE_ORDER_TEMPLATE_${plan}_ADDON not set`,
      );
      return NextResponse.json(
        {
          error:
            "Payments aren't set up correctly yet. Please reach out — our team has been notified.",
        },
        { status: 503 },
      );
    }
    const startDate =
      plan === "MONTHLY"
        ? nextFirstOfMonth(now).toISOString().slice(0, 10)
        : oneYearLater(now).toISOString().slice(0, 10);

    const addonSubResp = await square.subscriptions.create({
      idempotencyKey: `addon-sub-${user.id}-${addonIndex}`,
      locationId: SQUARE_LOCATION_ID,
      planVariationId,
      customerId: user.squareCustomerId,
      cardId,
      startDate,
      timezone: "America/Chicago",
      // Match the base subscribe flow — RELATIVE-priced plans
      // need explicit phases supplying the dollar amount.
      phases: [{ ordinal: 0n, orderTemplateId }],
    });
    const addonSquareSubId = addonSubResp.subscription?.id;
    if (!addonSquareSubId) {
      throw new Error("Square addon subscription create returned no id.");
    }

    // 3. Bump the count + remember the Square sub id so the
    //    billing page can offer a per-addon Remove button later.
    const updated = await prisma.subscription.update({
      where: { userId: user.id },
      data: {
        addonCapsuleCount: { increment: 1 },
        addonSquareSubIds: { push: addonSquareSubId },
      },
      select: {
        addonCapsuleCount: true,
        baseCapsuleCount: true,
      },
    });

    await captureServerEvent(userId, "subscription_addon_added", {
      plan,
      newAddonCount: updated.addonCapsuleCount,
    });

    return NextResponse.json({
      success: true,
      newSlotCount: updated.baseCapsuleCount + updated.addonCapsuleCount,
      nextRenewalAmountCents,
    });
  } catch (err) {
    const e = err as {
      errors?: { code?: string; detail?: string }[];
      message?: string;
    };
    const code = e?.errors?.[0]?.code ?? "";
    console.error(
      "[payments/addon-capsule] error:",
      code,
      e?.message ?? e,
    );
    if (
      code === "CARD_DECLINED" ||
      code === "GENERIC_DECLINE" ||
      code === "INSUFFICIENT_FUNDS"
    ) {
      return NextResponse.json(
        {
          error:
            "Your card on file was declined. Please update your payment method.",
        },
        { status: 402 },
      );
    }
    return NextResponse.json(
      { error: "We couldn't add a slot. Please try again." },
      { status: 500 },
    );
  }
}
