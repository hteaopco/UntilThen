import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { captureServerEvent } from "@/lib/posthog-server";
import {
  calculateProration,
  nextFirstOfMonth,
} from "@/lib/proration";
import {
  SQUARE_LOCATION_ID,
  SQUARE_PLAN_IDS,
  createAddonOrderTemplate,
  getSquareClient,
  squareIsConfigured,
} from "@/lib/square";
import { retryOnIdempotencyReuse } from "@/lib/square-idempotency";
import { scheduleAnnualRebuild } from "@/lib/square-sub-rebuild";

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
          currentPeriodEnd: true,
          pendingPlan: true,
          pendingSquareSubId: true,
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
    // ── ANNUAL path: scheduled-rebuild at renewal ──
    //
    // We used to call `subscriptions.update` with
    // `priceOverrideMoney`, but Square rejects that when an
    // `orderTemplateId` is present on the sub (and every annual
    // sub we create has one). Instead we schedule a fresh annual
    // sub to start at the existing currentPeriodEnd with a new
    // custom template baking in the updated addon total. The slot
    // is granted immediately in our DB; Square bills the current
    // cycle at the old amount and the merged total kicks in at
    // renewal.
    if (plan === "ANNUAL") {
      // A switch-plan (monthly→annual or annual→monthly) in
      // flight conflicts — addon rebuilds and cadence switches
      // use the same pending-sub slot. Also reject if a previous
      // addon rebuild's pending sub is for a DIFFERENT target
      // plan (defense-in-depth against race conditions).
      const earlierPendingSubId = user.subscription.pendingSquareSubId;
      const earlierPendingPlan = user.subscription.pendingPlan;
      if (
        earlierPendingPlan &&
        earlierPendingPlan !== "ANNUAL"
      ) {
        return NextResponse.json(
          {
            error:
              "A plan change is already scheduled. Wait for it to take effect before adding capsules.",
          },
          { status: 409 },
        );
      }
      if (!user.squareCardId) {
        return NextResponse.json(
          {
            error:
              "No card on file found. Please re-enter your card details.",
          },
          { status: 409 },
        );
      }

      const newCount = addonIndex + 1;
      const rebuild = await scheduleAnnualRebuild({
        square,
        userId: user.id,
        customerId: user.squareCustomerId,
        cardId: user.squareCardId,
        currentSubscriptionId: user.subscription.squareSubId,
        effectiveDate: user.subscription.currentPeriodEnd,
        newAddonCount: newCount,
        existingPendingSubId: earlierPendingSubId,
      });

      const updated = await prisma.subscription.update({
        where: { userId: user.id },
        data: {
          addonCapsuleCount: { increment: 1 },
          // Piggyback on the existing pendingPlan machinery so
          // the existing webhook promotion path picks up the new
          // sub when it activates. plan === pendingPlan signals
          // "annual rebuild" to the webhook (vs a cadence switch).
          pendingPlan: "ANNUAL",
          pendingSquareSubId: rebuild.newPendingSubId,
          pendingEffectiveDate: rebuild.effectiveDate,
        },
        select: {
          addonCapsuleCount: true,
          baseCapsuleCount: true,
        },
      });

      await captureServerEvent(userId, "subscription_addon_added", {
        plan,
        newAddonCount: updated.addonCapsuleCount,
        billingModel: "annual-rebuild",
      });

      return NextResponse.json({
        success: true,
        newSlotCount: updated.baseCapsuleCount + updated.addonCapsuleCount,
        // Annual addons don't charge today. Client UI reads
        // these fields to show the "free until renewal"
        // confirmation copy with the exact effective date.
        freeUntilRenewal: true,
        nextRenewalAmountCents: rebuild.nextRenewalAmountCents,
        effectiveDate: rebuild.effectiveDate.toISOString(),
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
      // Short key stem so the helper's retry suffix fits under
      // Square's 45-char limit: "ac-" (3) + cuid (25) + "-" (1)
      // + addonIndex digits = ~30, leaving room for a "-r<time>"
      // append on reuse-retry.
      const payResp = await retryOnIdempotencyReuse(
        `ac-${user.id}-${addonIndex}`,
        (idempotencyKey) =>
          square.payments.create({
            idempotencyKey,
            sourceId: cardId,
            customerId: user.squareCustomerId!,
            amountMoney: {
              amount: BigInt(amountTodayCents),
              currency: "USD",
            },
            locationId: SQUARE_LOCATION_ID,
            note: "untilThen add-on capsule · prorated",
            referenceId: user.id,
          }),
      );
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
    // Each addon sub needs its OWN order template — Square
    // enforces one-template-per-active-sub, so reusing a shared
    // id blows up the moment a user adds a second addon.
    const planVariationId = SQUARE_PLAN_IDS.MONTHLY_ADDON;
    const orderTemplateId = await createAddonOrderTemplate(
      "MONTHLY",
      `ot-${user.id}-${addonIndex}`,
    );
    const startDate = nextFirstOfMonth(now).toISOString().slice(0, 10);

    // Short stem ("as-<userId>-<index>") leaves room for the
    // helper's retry suffix.
    const addonSubResp = await retryOnIdempotencyReuse(
      `as-${user.id}-${addonIndex}`,
      (idempotencyKey) =>
        square.subscriptions.create({
          idempotencyKey,
          locationId: SQUARE_LOCATION_ID,
          planVariationId,
          customerId: user.squareCustomerId!,
          cardId,
          startDate,
          timezone: "America/Chicago",
          phases: [{ ordinal: 0n, orderTemplateId }],
        }),
    );
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
