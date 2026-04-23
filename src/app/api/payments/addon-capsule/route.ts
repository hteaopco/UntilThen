import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { captureServerEvent } from "@/lib/posthog-server";
import {
  ANNUAL_ADDON_CENTS,
  ANNUAL_BASE_CENTS,
  calculateProration,
  nextFirstOfMonth,
} from "@/lib/proration";
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
 * Flow branches on base plan cadence:
 *
 *   MONTHLY — classic per-addon model. Prorate this month's
 *   $0.99, charge the card now, create a separate Square
 *   addon subscription on the monthly cadence. Stored in
 *   addonSquareSubIds so remove-addon can cancel it later.
 *
 *   ANNUAL — merged-into-base model. Grant the slot
 *   immediately but DON'T charge and DON'T create a separate
 *   sub. Instead, bump the base sub's price_override_money to
 *   $35.99 + ($6 × addonCount) so Square bills the combined
 *   amount on the annual renewal. Trade-off: user gets the
 *   addon free until their renewal (max $6 of lost revenue),
 *   but the UX story is "add capsules free until your next
 *   renewal" — a growth lever on top of the simpler data model.
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
      squareCardId: true,
      subscription: {
        select: {
          id: true,
          plan: true,
          status: true,
          squareSubId: true,
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
    // ── ANNUAL path: merge into base sub via price_override ──
    if (plan === "ANNUAL") {
      const newCount = addonIndex + 1;
      const newBasePriceCents = ANNUAL_BASE_CENTS + ANNUAL_ADDON_CENTS * newCount;

      await square.subscriptions.update({
        subscriptionId: user.subscription.squareSubId,
        subscription: {
          priceOverrideMoney: {
            amount: BigInt(newBasePriceCents),
            currency: "USD",
          },
        },
      });

      const updated = await prisma.subscription.update({
        where: { userId: user.id },
        data: {
          addonCapsuleCount: { increment: 1 },
        },
        select: {
          addonCapsuleCount: true,
          baseCapsuleCount: true,
        },
      });

      await captureServerEvent(userId, "subscription_addon_added", {
        plan,
        newAddonCount: updated.addonCapsuleCount,
        billingModel: "annual-override",
      });

      return NextResponse.json({
        success: true,
        newSlotCount: updated.baseCapsuleCount + updated.addonCapsuleCount,
        // Annual addons don't charge right now — they ride the
        // next renewal. Client UI reads this flag to show the
        // "free until renewal" confirmation copy.
        freeUntilRenewal: true,
        nextRenewalAmountCents: newBasePriceCents,
      });
    }

    // ── MONTHLY path: separate addon sub, prorated upfront ──
    if (!user.squareCardId) {
      return NextResponse.json(
        {
          error:
            "No card on file found. Please re-enter your card details.",
        },
        { status: 409 },
      );
    }
    const cardId = user.squareCardId;

    // 1. Prorated upfront charge for this month.
    const { amountTodayCents, nextRenewalAmountCents } = calculateProration(
      { plan, type: "addon" },
      now,
    );

    if (amountTodayCents > 0) {
      // Catch IDEMPOTENCY_KEY_REUSED and retry with a fresh key
      // — the stable "addon-charge-<userId>-<index>" key can
      // collide with a prior failed attempt whose params
      // (card id, prorated amount after reset + new subscribe,
      // customer id) no longer match. The cached failure means
      // no charge actually went through, so retrying is safe.
      const chargePayload = {
        sourceId: cardId,
        customerId: user.squareCustomerId,
        amountMoney: {
          amount: BigInt(amountTodayCents),
          currency: "USD" as const,
        },
        locationId: SQUARE_LOCATION_ID,
        note: "untilThen add-on capsule · prorated",
        referenceId: user.id,
      };
      let payResp;
      try {
        payResp = await square.payments.create({
          idempotencyKey: `addon-charge-${user.id}-${addonIndex}`,
          ...chargePayload,
        });
      } catch (err) {
        const code = (err as { errors?: { code?: string }[] })
          .errors?.[0]?.code;
        if (code !== "IDEMPOTENCY_KEY_REUSED") throw err;
        console.log(
          `[payments/addon-capsule] charge idempotency key reused for ${user.id} — retrying with fresh key`,
        );
        payResp = await square.payments.create({
          idempotencyKey: `addon-charge-${user.id}-${addonIndex}-${Date.now().toString(36)}`,
          ...chargePayload,
        });
      }
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

    // 2. Monthly addon sub so renewal continues each month.
    const planVariationId = SQUARE_PLAN_IDS.MONTHLY_ADDON;
    const orderTemplateId = SQUARE_ORDER_TEMPLATE_IDS.MONTHLY_ADDON;
    if (!orderTemplateId) {
      console.error(
        "[payments/addon-capsule] SQUARE_ORDER_TEMPLATE_MONTHLY_ADDON not set",
      );
      return NextResponse.json(
        {
          error:
            "Payments aren't set up correctly yet. Please reach out — our team has been notified.",
        },
        { status: 503 },
      );
    }
    const startDate = nextFirstOfMonth(now).toISOString().slice(0, 10);

    // Same idempotency-retry pattern as the charge above.
    const subPayload = {
      locationId: SQUARE_LOCATION_ID,
      planVariationId,
      customerId: user.squareCustomerId,
      cardId,
      startDate,
      timezone: "America/Chicago",
      phases: [{ ordinal: 0n, orderTemplateId }],
    };
    let addonSubResp;
    try {
      addonSubResp = await square.subscriptions.create({
        idempotencyKey: `addon-sub-${user.id}-${addonIndex}`,
        ...subPayload,
      });
    } catch (err) {
      const code = (err as { errors?: { code?: string }[] })
        .errors?.[0]?.code;
      if (code !== "IDEMPOTENCY_KEY_REUSED") throw err;
      console.log(
        `[payments/addon-capsule] sub idempotency key reused for ${user.id} — retrying with fresh key`,
      );
      addonSubResp = await square.subscriptions.create({
        idempotencyKey: `addon-sub-${user.id}-${addonIndex}-${Date.now().toString(36)}`,
        ...subPayload,
      });
    }
    const addonSquareSubId = addonSubResp.subscription?.id;
    if (!addonSquareSubId) {
      throw new Error("Square addon subscription create returned no id.");
    }

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
      billingModel: "monthly-separate",
    });

    return NextResponse.json({
      success: true,
      newSlotCount: updated.baseCapsuleCount + updated.addonCapsuleCount,
      freeUntilRenewal: false,
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
