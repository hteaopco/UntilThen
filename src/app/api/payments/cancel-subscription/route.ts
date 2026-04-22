import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { backfillAddonSquareSubIds } from "@/lib/addon-backfill";
import { captureServerEvent } from "@/lib/posthog-server";
import { getSquareClient, squareIsConfigured } from "@/lib/square";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/cancel-subscription
 *
 * Cancel the user's base subscription. Square's cancel is a
 * scheduled cancel: the subscription stays ACTIVE through
 * charged_through_date (the user keeps access for the billing
 * period they've already paid for) and simply doesn't renew.
 *
 * We mirror that on our side by flipping status → CANCELLED and
 * holding currentPeriodEnd. Once the Square side actually lapses,
 * the webhook (subscription.updated → DEACTIVATED) flips status
 * to LOCKED and the paywall gate re-engages.
 *
 * Also cancels any pending plan-switch subscription that was
 * queued up — otherwise a user who cancels mid-switch ends up
 * with a phantom Square sub silently activating next month.
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

  // Backfill first so we can cancel legacy addons that weren't
  // tracked when they were originally purchased.
  await backfillAddonSquareSubIds(lookupUser.id);

  const user = await prisma.user.findUnique({
    where: { id: lookupUser.id },
    select: {
      id: true,
      subscription: {
        select: {
          id: true,
          squareSubId: true,
          status: true,
          pendingSquareSubId: true,
          addonSquareSubIds: true,
        },
      },
    },
  });
  if (!user) return NextResponse.json({ error: "User not found." }, { status: 404 });
  const sub = user.subscription;
  if (!sub)
    return NextResponse.json(
      { error: "No subscription to cancel." },
      { status: 409 },
    );
  if (sub.status === "CANCELLED")
    return NextResponse.json(
      { error: "Your subscription is already cancelled." },
      { status: 409 },
    );

  const square = getSquareClient();

  try {
    await square.subscriptions.cancel({ subscriptionId: sub.squareSubId });
    if (sub.pendingSquareSubId) {
      try {
        await square.subscriptions.cancel({
          subscriptionId: sub.pendingSquareSubId,
        });
      } catch (err) {
        // Non-fatal — log and keep going so the user's cancel
        // request still succeeds on the primary sub.
        console.error(
          "[payments/cancel-subscription] pending cancel failed:",
          err,
        );
      }
    }
    // Dropping the base cancels every linked addon too — the
    // user's rule: no addons without the base sub. Each one is
    // a standalone Square subscription, so we loop and cancel.
    for (const addonSubId of sub.addonSquareSubIds) {
      try {
        await square.subscriptions.cancel({ subscriptionId: addonSubId });
      } catch (err) {
        console.error(
          `[payments/cancel-subscription] addon ${addonSubId} cancel failed:`,
          err,
        );
      }
    }

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: "CANCELLED",
        pendingPlan: null,
        pendingSquareSubId: null,
        pendingEffectiveDate: null,
      },
    });

    await captureServerEvent(userId, "subscription_cancelled", {
      userId: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const e = err as { message?: string };
    console.error("[payments/cancel-subscription] error:", e?.message ?? e);
    return NextResponse.json(
      { error: "We couldn't cancel your subscription. Please try again." },
      { status: 500 },
    );
  }
}
