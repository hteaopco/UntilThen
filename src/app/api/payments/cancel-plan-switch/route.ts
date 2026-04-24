import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { captureServerEvent } from "@/lib/posthog-server";
import { getSquareClient, squareIsConfigured } from "@/lib/square";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/cancel-plan-switch
 *
 * Undo a pending monthly → annual upgrade before its effective
 * date. Two Square operations to reverse the switch-plan flow:
 *
 *   1. Delete the CANCEL action on the current (monthly) sub so
 *      it stops being "cancel at period end" and goes back to
 *      renewing normally. Square exposes a deleteAction endpoint
 *      that removes scheduled actions by id.
 *   2. Cancel the pending annual sub we created with
 *      start_date = effectiveDate, so it never activates and the
 *      card on file never gets charged on that day.
 *
 * Both ops have to succeed before we clear our pending fields —
 * otherwise we'd end up with a monthly that's still scheduled to
 * cancel OR a phantom annual that silently starts billing. On
 * failure we don't partially roll back; the user retries or we
 * ask them to reach out.
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

  const user = await prisma.user.findUnique({
    where: { id: lookupUser.id },
    select: {
      subscription: {
        select: {
          id: true,
          squareSubId: true,
          status: true,
          plan: true,
          pendingPlan: true,
          pendingSquareSubId: true,
          pendingEffectiveDate: true,
        },
      },
    },
  });
  const sub = user?.subscription;
  if (!sub)
    return NextResponse.json(
      { error: "No subscription found." },
      { status: 404 },
    );
  if (!sub.pendingPlan || !sub.pendingSquareSubId || !sub.pendingEffectiveDate)
    return NextResponse.json(
      { error: "No pending plan switch to cancel." },
      { status: 409 },
    );
  // Annual-addon rebuilds park their scheduled sub in the same
  // pendingSquareSubId slot used by cadence switches (plan ===
  // pendingPlan signals "rebuild"). The cancel-switch UI is
  // only meant for monthly→annual cadence changes; rolling back
  // an addon rebuild is a different flow and could strand the
  // user with the new addon count but no corresponding billing.
  // Reject here so the wrong button can't silently un-schedule
  // a rebuild.
  if (sub.plan === sub.pendingPlan) {
    return NextResponse.json(
      {
        error:
          "Can't undo a scheduled capsule-count update this way. Remove the extra capsule from your plan instead, or wait for the next renewal.",
      },
      { status: 409 },
    );
  }
  if (sub.pendingEffectiveDate.getTime() <= Date.now())
    return NextResponse.json(
      {
        error:
          "The switch has already taken effect. Contact support if this looks wrong.",
      },
      { status: 409 },
    );

  const square = getSquareClient();

  try {
    // 1. Find and delete the pending CANCEL action on the current
    //    sub. include=actions is how Square surfaces scheduled
    //    changes; we grep for the one that matches our cancel.
    const retrieved = await square.subscriptions.get({
      subscriptionId: sub.squareSubId,
      include: "actions",
    });
    const actions = retrieved.subscription?.actions ?? [];
    const pendingCancel = actions.find((a) => a.type === "CANCEL");
    if (pendingCancel?.id) {
      await square.subscriptions.deleteAction({
        subscriptionId: sub.squareSubId,
        actionId: pendingCancel.id,
      });
    } else {
      console.warn(
        `[payments/cancel-plan-switch] no CANCEL action on ${sub.squareSubId} — monthly may not renew`,
      );
    }

    // 2. Cancel the pending annual sub before it starts billing.
    //    Scheduled cancel is fine — the effective date hasn't
    //    passed so the sub never activates and no charge fires.
    await square.subscriptions.cancel({
      subscriptionId: sub.pendingSquareSubId,
    });

    // 3. Clear our pending fields once both Square ops succeeded.
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        pendingPlan: null,
        pendingSquareSubId: null,
        pendingEffectiveDate: null,
      },
    });

    await captureServerEvent(userId, "subscription_switch_cancelled", {
      revertedTo: "MONTHLY",
      wouldHaveSwitchedOn: sub.pendingEffectiveDate.toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const e = err as {
      errors?: { code?: string; detail?: string }[];
      message?: string;
    };
    console.error(
      "[payments/cancel-plan-switch] error:",
      e?.errors?.[0]?.code,
      e?.message ?? e,
    );
    return NextResponse.json(
      {
        error:
          "We couldn't cancel the pending switch. Please try again or reach out.",
      },
      { status: 500 },
    );
  }
}
