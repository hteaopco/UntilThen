import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { backfillAddonSquareSubIds } from "@/lib/addon-backfill";
import { captureServerEvent } from "@/lib/posthog-server";
import { nextFirstOfMonth, oneYearLater } from "@/lib/proration";
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
 * POST /api/payments/resume-subscription
 *
 * One-click un-cancel for a CANCELLED subscription.
 *
 * Square doesn't expose an "undo cancel" endpoint — once the
 * cancel flag is set, the only way forward is a fresh
 * subscription. So we create new base + addon subs using the
 * card already on file, aligned on the existing currentPeriodEnd
 * so there's no double-billing window:
 *
 *   - If currentPeriodEnd is still in the future → the new base
 *     sub's start_date is that date. Old sub naturally ends on
 *     the same day Square activates the new one. Zero gap,
 *     zero overlap.
 *   - If currentPeriodEnd already passed → start today. Monthly
 *     hops to the next 1st per the usual subscribe flow; annual
 *     starts billing immediately.
 *
 * Addons mirror the base's cadence + start date (close enough
 * for our rule that \"all subs share a card and cadence\").
 */
export async function POST(): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 500 },
    );
  if (!squareIsConfigured())
    return NextResponse.json(
      { error: "Payments aren't configured yet." },
      { status: 503 },
    );

  const { prisma } = await import("@/lib/prisma");
  const lookupUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!lookupUser)
    return NextResponse.json({ error: "User not found." }, { status: 404 });

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
          plan: true,
          status: true,
          currentPeriodEnd: true,
          addonCapsuleCount: true,
          addonSquareSubIds: true,
        },
      },
    },
  });
  if (!user?.subscription)
    return NextResponse.json(
      { error: "No subscription to resume." },
      { status: 409 },
    );
  const sub = user.subscription;
  if (sub.status !== "CANCELLED")
    return NextResponse.json(
      { error: "Subscription isn't cancelled." },
      { status: 409 },
    );
  if (!user.squareCustomerId || !user.squareCardId)
    return NextResponse.json(
      {
        error:
          "No payment method on file. Add a card first, then resume.",
      },
      { status: 409 },
    );

  const square = getSquareClient();
  const now = new Date();
  const periodEndInFuture = sub.currentPeriodEnd.getTime() > now.getTime();
  const startDate = (periodEndInFuture ? sub.currentPeriodEnd : now)
    .toISOString()
    .slice(0, 10);

  // Plan variations + order templates are picked per cadence.
  const basePlanVariation =
    sub.plan === "MONTHLY"
      ? SQUARE_PLAN_IDS.MONTHLY_BASE
      : SQUARE_PLAN_IDS.ANNUAL_BASE;
  const baseOrderTemplate =
    sub.plan === "MONTHLY"
      ? SQUARE_ORDER_TEMPLATE_IDS.MONTHLY_BASE
      : SQUARE_ORDER_TEMPLATE_IDS.ANNUAL_BASE;
  const addonPlanVariation =
    sub.plan === "MONTHLY"
      ? SQUARE_PLAN_IDS.MONTHLY_ADDON
      : SQUARE_PLAN_IDS.ANNUAL_ADDON;
  const addonOrderTemplate =
    sub.plan === "MONTHLY"
      ? SQUARE_ORDER_TEMPLATE_IDS.MONTHLY_ADDON
      : SQUARE_ORDER_TEMPLATE_IDS.ANNUAL_ADDON;
  if (!baseOrderTemplate || (sub.addonCapsuleCount > 0 && !addonOrderTemplate)) {
    return NextResponse.json(
      {
        error:
          "Payments aren't set up correctly yet. Please reach out — our team has been notified.",
      },
      { status: 503 },
    );
  }

  try {
    // Idempotency: tie to userId + current period_end so a
    // page-refresh retry doesn't spawn duplicate subs. Square
    // caps keys at 45 chars; "rs-" (3) + cuid (25) + "-" (1) +
    // YYYYMMDD (8) = 37.
    const ymd = startDate.replace(/-/g, "");

    const baseResp = await square.subscriptions.create({
      idempotencyKey: `rs-${user.id}-${ymd}`,
      locationId: SQUARE_LOCATION_ID,
      planVariationId: basePlanVariation,
      customerId: user.squareCustomerId,
      cardId: user.squareCardId,
      startDate,
      timezone: "America/Chicago",
      phases: [{ ordinal: 0n, orderTemplateId: baseOrderTemplate }],
    });
    const newBaseSubId = baseResp.subscription?.id;
    if (!newBaseSubId)
      throw new Error("Square base subscription create returned no id.");

    const newAddonSubIds: string[] = [];
    for (let i = 0; i < sub.addonCapsuleCount; i++) {
      const addonResp = await square.subscriptions.create({
        // Scoped per addon index so resume creates the right
        // number of addon subs without colliding.
        idempotencyKey: `rsa-${user.id}-${ymd}-${i}`,
        locationId: SQUARE_LOCATION_ID,
        planVariationId: addonPlanVariation,
        customerId: user.squareCustomerId,
        cardId: user.squareCardId,
        startDate,
        timezone: "America/Chicago",
        phases: [{ ordinal: 0n, orderTemplateId: addonOrderTemplate! }],
      });
      const addonId = addonResp.subscription?.id;
      if (!addonId) throw new Error("Square addon subscription create returned no id.");
      newAddonSubIds.push(addonId);
    }

    // New period end for our DB. For monthly, Square starts on
    // the 1st and renews monthly — so our next renewal is 1st
    // of month after start. For annual, start + 1 year.
    const startDateObj = new Date(`${startDate}T12:00:00Z`);
    const newPeriodEnd =
      sub.plan === "MONTHLY"
        ? nextFirstOfMonth(startDateObj)
        : oneYearLater(startDateObj);

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        squareSubId: newBaseSubId,
        status: "ACTIVE",
        currentPeriodEnd: newPeriodEnd,
        addonSquareSubIds: newAddonSubIds,
        // Any stale pending plan-switch state got invalidated by
        // the cancel; wipe it so the user starts clean.
        pendingPlan: null,
        pendingSquareSubId: null,
        pendingEffectiveDate: null,
      },
    });

    await captureServerEvent(userId, "subscription_resumed", {
      plan: sub.plan,
      addonCount: sub.addonCapsuleCount,
      startDate,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const code = (err as { errors?: { code?: string }[] })?.errors?.[0]?.code;
    console.error(
      "[payments/resume-subscription] create failed:",
      code,
      err,
    );
    return NextResponse.json(
      {
        error:
          "We couldn't resume your subscription. Please try again or start a fresh subscription.",
      },
      { status: 500 },
    );
  }
}
