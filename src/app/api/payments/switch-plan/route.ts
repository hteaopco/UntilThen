import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { backfillAddonSquareSubIds } from "@/lib/addon-backfill";
import { captureServerEvent } from "@/lib/posthog-server";
import { ANNUAL_ADDON_CENTS, ANNUAL_BASE_CENTS } from "@/lib/proration";
import {
  SQUARE_LOCATION_ID,
  SQUARE_ORDER_TEMPLATE_IDS,
  SQUARE_PLAN_IDS,
  getSquareClient,
  squareIsConfigured,
} from "@/lib/square";
import { retryOnIdempotencyReuse } from "@/lib/square-idempotency";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { targetPlan?: unknown };

/**
 * POST /api/payments/switch-plan
 *
 * Schedule a Monthly ↔ Annual switch. The swap always takes
 * effect at the end of the current billing period — no proration,
 * no refunds, no overlap:
 *
 *   1. Cancel the current Square subscription. Square keeps it
 *      active (charged_through_date stays) but stops it from
 *      renewing.
 *   2. Create a new Square subscription with start_date set to
 *      the current period end, so the new plan starts billing
 *      exactly when the old one would have renewed.
 *   3. Stamp our Subscription row with pendingPlan /
 *      pendingSquareSubId / pendingEffectiveDate. The Square
 *      webhook (subscription.created for the new sub) promotes
 *      them into plan / squareSubId when it fires, so the UI
 *      shows the switch the moment Square activates it.
 *
 * Addons handling: monthly addons live as separate Square subs.
 * On the upgrade we cancel each one at period end and bake the
 * count into the new annual base sub via priceOverrideMoney
 * (= $35.99 + $6 × addonCount). When the new sub activates,
 * the webhook clears addonSquareSubIds since the addons are now
 * inside the base. User pitch: "your addons stay active free
 * through your renewal."
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
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

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const targetPlan = body.targetPlan;
  if (targetPlan !== "MONTHLY" && targetPlan !== "ANNUAL") {
    return NextResponse.json(
      { error: "targetPlan must be MONTHLY or ANNUAL." },
      { status: 400 },
    );
  }

  const { prisma } = await import("@/lib/prisma");
  const lookupUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!lookupUser)
    return NextResponse.json({ error: "User not found." }, { status: 404 });

  // Backfill addon ids first so the cancel loop below catches
  // every Square sub even if older addons predate id tracking.
  await backfillAddonSquareSubIds(lookupUser.id);

  const user = await prisma.user.findUnique({
    where: { id: lookupUser.id },
    select: {
      id: true,
      squareCustomerId: true,
      squareCardId: true,
      subscription: {
        select: {
          id: true,
          squareSubId: true,
          plan: true,
          status: true,
          addonCapsuleCount: true,
          addonSquareSubIds: true,
          currentPeriodEnd: true,
          pendingPlan: true,
          pendingSquareSubId: true,
        },
      },
    },
  });
  if (!user)
    return NextResponse.json({ error: "User not found." }, { status: 404 });

  const sub = user.subscription;
  if (!sub || sub.status !== "ACTIVE")
    return NextResponse.json(
      { error: "You need an active subscription to switch plans." },
      { status: 409 },
    );
  if (sub.pendingPlan)
    return NextResponse.json(
      { error: "A plan change is already scheduled." },
      { status: 409 },
    );
  if (sub.plan === targetPlan)
    return NextResponse.json(
      { error: `You're already on the ${targetPlan.toLowerCase()} plan.` },
      { status: 409 },
    );
  // Annual → Monthly is intentionally not supported: annual
  // subscribers have already paid for the year, so switching
  // mid-stream would either refund partially (complex) or
  // double-bill (bad UX). They can switch when the annual
  // renews. Only MONTHLY → ANNUAL goes through this route.
  if (sub.plan === "ANNUAL") {
    return NextResponse.json(
      {
        error:
          "Your annual plan runs through its full term. You can switch to monthly when it renews.",
      },
      { status: 409 },
    );
  }
  if (!user.squareCustomerId || !user.squareCardId)
    return NextResponse.json(
      {
        error:
          "No payment method on file. Add a card before switching plans.",
      },
      { status: 409 },
    );

  const square = getSquareClient();

  try {
    // 1. Cancel the current Square base subscription (scheduled
    //    — keeps it active through its charged-through date and
    //    stops it from renewing).
    await square.subscriptions.cancel({ subscriptionId: sub.squareSubId });

    // 2. Cancel every monthly addon sub at period end too. They
    //    won't roll over into the new annual sub because annual
    //    addons live inside the base via priceOverrideMoney.
    //    Failures here are logged but non-fatal — the user
    //    upgrade should proceed even if a stale addon id can't
    //    be cancelled cleanly.
    for (const addonSubId of sub.addonSquareSubIds) {
      try {
        await square.subscriptions.cancel({ subscriptionId: addonSubId });
      } catch (err) {
        console.error(
          `[payments/switch-plan] addon ${addonSubId} cancel failed:`,
          err,
        );
      }
    }

    // 3. Create the replacement subscription starting on the old
    //    one's currentPeriodEnd. Square bills it the day it
    //    activates, so there's no overlap or double-charge.
    //    Annual addons fold into the base via priceOverrideMoney.
    const newPlanVariationId =
      targetPlan === "MONTHLY"
        ? SQUARE_PLAN_IDS.MONTHLY_BASE
        : SQUARE_PLAN_IDS.ANNUAL_BASE;
    const newOrderTemplate =
      targetPlan === "MONTHLY"
        ? SQUARE_ORDER_TEMPLATE_IDS.MONTHLY_BASE
        : SQUARE_ORDER_TEMPLATE_IDS.ANNUAL_BASE;
    if (!newOrderTemplate) {
      console.error(
        `[payments/switch-plan] SQUARE_ORDER_TEMPLATE_${targetPlan}_BASE not set`,
      );
      return NextResponse.json(
        {
          error:
            "Payments aren't set up correctly yet. Please reach out — our team has been notified.",
        },
        { status: 503 },
      );
    }

    const effective = sub.currentPeriodEnd;
    const startDate = effective.toISOString().slice(0, 10);

    // Annual baked-in addon override. Monthly target keeps no
    // override — separate addon subs would be re-created at
    // future per-addon purchase time (currently we don't carry
    // them over on monthly→annual; the reverse is gone too).
    const annualOverride =
      targetPlan === "ANNUAL" && sub.addonCapsuleCount > 0
        ? {
            priceOverrideMoney: {
              amount: BigInt(
                ANNUAL_BASE_CENTS + ANNUAL_ADDON_CENTS * sub.addonCapsuleCount,
              ),
              currency: "USD" as const,
            },
          }
        : {};

    // Idempotency: "swp-<userId>-<targetPlan>" keeps retries of
    // the same switch safe. Under 45 chars: "swp-" (4) + cuid (25)
    // + "-" (1) + "ANNUAL" (6) = 36. Wrapped in the reuse-retry
    // helper so a stale cached failure from a prior attempt
    // (different card, different customer post-reset, etc.)
    // recovers with a fresh key instead of surfacing a 500.
    const subResp = await retryOnIdempotencyReuse(
      `swp-${user.id}-${targetPlan}`,
      (idempotencyKey) =>
        square.subscriptions.create({
          idempotencyKey,
          locationId: SQUARE_LOCATION_ID,
          planVariationId: newPlanVariationId,
          customerId: user.squareCustomerId!,
          cardId: user.squareCardId!,
          startDate,
          timezone: "America/Chicago",
          phases: [{ ordinal: 0n, orderTemplateId: newOrderTemplate }],
          ...annualOverride,
        }),
    );
    const newSub = subResp.subscription;
    if (!newSub?.id) {
      throw new Error("Square subscription create returned no id.");
    }

    // 4. Stamp pending fields on our row.
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        pendingPlan: targetPlan,
        pendingSquareSubId: newSub.id,
        pendingEffectiveDate: effective,
      },
    });

    await captureServerEvent(userId, "subscription_switch_scheduled", {
      from: sub.plan,
      to: targetPlan,
      effectiveDate: effective.toISOString(),
      addonCount: sub.addonCapsuleCount,
    });

    return NextResponse.json({
      success: true,
      effectiveDate: effective.toISOString(),
    });
  } catch (err) {
    const e = err as {
      errors?: { code?: string; detail?: string }[];
      message?: string;
    };
    const code = e?.errors?.[0]?.code ?? "";
    console.error("[payments/switch-plan] error:", code, e?.message ?? e);
    return NextResponse.json(
      { error: "We couldn't schedule the switch. Please try again." },
      { status: 500 },
    );
  }
}
