import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { captureServerEvent } from "@/lib/posthog-server";
import {
  SQUARE_LOCATION_ID,
  SQUARE_PLAN_IDS,
  getSquareClient,
  squareIsConfigured,
} from "@/lib/square";

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
 * v1 constraint: only allow switch when addonCapsuleCount === 0.
 * Addon subscriptions are separate Square resources — switching
 * them all atomically is a future enhancement.
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
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: {
      id: true,
      squareCustomerId: true,
      subscription: {
        select: {
          id: true,
          squareSubId: true,
          plan: true,
          status: true,
          addonCapsuleCount: true,
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
  if (sub.addonCapsuleCount > 0)
    return NextResponse.json(
      {
        error:
          "Remove your add-on capsules before switching plans, or contact support.",
      },
      { status: 409 },
    );
  if (!user.squareCustomerId)
    return NextResponse.json(
      { error: "No Square customer on file." },
      { status: 409 },
    );

  const square = getSquareClient();

  try {
    // 1. Cancel the current Square subscription. This is a
    //    scheduled cancel — Square keeps the sub active through
    //    its charged-through date and stops it from renewing.
    await square.subscriptions.cancel({ subscriptionId: sub.squareSubId });

    // 2. Find the customer's card on file — the new sub needs a
    //    cardId reference, same as the original subscribe flow.
    const cardsResp = await square.cards.list({
      customerId: user.squareCustomerId,
    });
    // The SDK returns a paginated iterator; grab the first page.
    const cards = cardsResp.data ?? [];
    const card = cards.find((c) => c.enabled !== false);
    if (!card?.id) {
      return NextResponse.json(
        {
          error:
            "We couldn't find your card on file. Please re-enter payment details.",
        },
        { status: 409 },
      );
    }

    // 3. Create the replacement subscription starting on the old
    //    one's currentPeriodEnd. Square bills it the day it
    //    activates, so there's no overlap or double-charge.
    const newPlanVariationId =
      targetPlan === "MONTHLY"
        ? SQUARE_PLAN_IDS.MONTHLY_BASE
        : SQUARE_PLAN_IDS.ANNUAL_BASE;
    const effective = sub.currentPeriodEnd;
    const startDate = effective.toISOString().slice(0, 10);

    // Idempotency: "swp-<userId>-<targetPlan>" keeps retries of
    // the same switch safe. Under 45 chars: "swp-" (4) + cuid (25)
    // + "-" (1) + "ANNUAL" (6) = 36.
    const subResp = await square.subscriptions.create({
      idempotencyKey: `swp-${user.id}-${targetPlan}`,
      locationId: SQUARE_LOCATION_ID,
      planVariationId: newPlanVariationId,
      customerId: user.squareCustomerId,
      cardId: card.id,
      startDate,
      timezone: "America/Chicago",
    });
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
