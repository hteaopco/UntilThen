import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { backfillAddonSquareSubIds } from "@/lib/addon-backfill";
import { captureServerEvent } from "@/lib/posthog-server";
import { getSquareClient, squareIsConfigured } from "@/lib/square";
import { scheduleAnnualRebuild } from "@/lib/square-sub-rebuild";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payments/remove-addon
 *
 * Cancels one addon subscription (reducing paid slots by 1).
 * Capsules and slots are decoupled — the user is just dropping
 * a paid slot, not a specific capsule. If removing this addon
 * brings their paid slot total below their active capsule count,
 * the most recently-created active vault auto-locks so the two
 * numbers line up again. They can swap which vault is locked
 * any time from the capsules page.
 *
 * We do this immediately (not at period end) so the UI stays
 * consistent with what the user sees. Small trade-off: the user
 * may effectively lose the remainder of the paid period on the
 * addon they just removed. Acceptable given the low price.
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
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!user)
    return NextResponse.json({ error: "User not found." }, { status: 404 });

  // Opportunistically backfill the Square sub id list if this is
  // a legacy addon that was purchased before we started tracking
  // ids. Without this, the pop-and-cancel below has nothing to
  // cancel.
  await backfillAddonSquareSubIds(user.id);

  const sub = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      plan: true,
      status: true,
      squareSubId: true,
      baseCapsuleCount: true,
      addonCapsuleCount: true,
      addonSquareSubIds: true,
      currentPeriodEnd: true,
      pendingPlan: true,
      pendingSquareSubId: true,
    },
  });
  if (!sub)
    return NextResponse.json(
      { error: "No subscription to modify." },
      { status: 409 },
    );
  if (sub.status !== "ACTIVE")
    return NextResponse.json(
      { error: "Reactivate your subscription before making changes." },
      { status: 409 },
    );
  if (sub.addonCapsuleCount <= 0)
    return NextResponse.json(
      { error: "No addons to remove." },
      { status: 409 },
    );

  const square = getSquareClient();
  const newAddonCount = sub.addonCapsuleCount - 1;

  // ── ANNUAL: scheduled-rebuild at renewal ──
  //
  // Same pattern as the add path in addon-capsule. We don't
  // touch the current sub's price (annual subs reject
  // priceOverrideMoney when a template is present). Instead we
  // schedule a fresh annual sub for the start of the next
  // cycle with a new merged template. The slot drops in our
  // DB immediately; the sub keeps billing the old higher
  // amount through the current cycle (the user is effectively
  // "paying for" the removed slot until renewal — acceptable
  // trade-off).
  if (sub.plan === "ANNUAL") {
    const earlierPendingSubId = sub.pendingSquareSubId;
    const earlierPendingPlan = sub.pendingPlan;
    if (earlierPendingPlan && earlierPendingPlan !== "ANNUAL") {
      return NextResponse.json(
        {
          error:
            "A plan change is already scheduled. Wait for it to take effect before removing capsules.",
        },
        { status: 409 },
      );
    }

    const userRow = await prisma.user.findUnique({
      where: { id: user.id },
      select: { squareCustomerId: true, squareCardId: true },
    });
    if (!userRow?.squareCustomerId || !userRow.squareCardId) {
      return NextResponse.json(
        {
          error:
            "No card on file found. Please re-enter your card details.",
        },
        { status: 409 },
      );
    }

    try {
      const rebuild = await scheduleAnnualRebuild({
        square,
        userId: user.id,
        customerId: userRow.squareCustomerId,
        cardId: userRow.squareCardId,
        currentSubscriptionId: sub.squareSubId,
        effectiveDate: sub.currentPeriodEnd,
        newAddonCount,
        existingPendingSubId: earlierPendingSubId,
      });
      await applyRemovalToDb({
        subId: sub.id,
        userId: user.id,
        newAddonCount,
        newAddonSubIds: sub.addonSquareSubIds,
        baseCapsuleCount: sub.baseCapsuleCount,
        pending: {
          plan: "ANNUAL",
          subId: rebuild.newPendingSubId,
          effectiveDate: rebuild.effectiveDate,
        },
      });
      await captureServerEvent(userId, "subscription_addon_removed", {
        newAddonCount,
        billingModel: "annual-rebuild",
      });
      return NextResponse.json({
        success: true,
        newSlotCount: sub.baseCapsuleCount + newAddonCount,
        nextRenewalAmountCents: rebuild.nextRenewalAmountCents,
        effectiveDate: rebuild.effectiveDate.toISOString(),
      });
    } catch (err) {
      console.error(
        "[payments/remove-addon] annual rebuild failed:",
        err,
      );
      return NextResponse.json(
        { error: "We couldn't remove that slot. Please try again." },
        { status: 500 },
      );
    }
  }

  // ── MONTHLY: pop + cancel one Square addon sub ──
  const addonIds = sub.addonSquareSubIds;
  // Pop the last one — if backfill populated them in creation
  // order, this removes the newest. No strong reason either way;
  // Square doesn't care.
  const toCancel = addonIds[addonIds.length - 1];
  const remaining = addonIds.slice(0, -1);

  if (toCancel) {
    try {
      await square.subscriptions.cancel({ subscriptionId: toCancel });
    } catch (err) {
      // If Square says the sub is already cancelled/gone, keep
      // going — we still want our DB to reflect reality.
      console.error(
        "[payments/remove-addon] Square cancel failed:",
        err,
      );
    }
  } else {
    // No Square id stored and backfill couldn't find one. Still
    // drop our internal count so slot math lines up, but log so
    // we notice — the customer may end up with an orphan billing
    // Square subscription.
    console.warn(
      `[payments/remove-addon] no Square sub id for user ${user.id} — backfill empty`,
    );
  }

  await applyRemovalToDb({
    subId: sub.id,
    userId: user.id,
    newAddonCount,
    newAddonSubIds: remaining,
    baseCapsuleCount: sub.baseCapsuleCount,
  });

  await captureServerEvent(userId, "subscription_addon_removed", {
    newAddonCount,
    billingModel: "monthly-separate",
  });

  return NextResponse.json({
    success: true,
    newSlotCount: sub.baseCapsuleCount + newAddonCount,
  });
}

/**
 * Shared post-removal DB bookkeeping: persists the new addon
 * count + sub-id array and auto-locks the newest active vault
 * when the user's capsule count now exceeds their paid slots.
 */
async function applyRemovalToDb({
  subId,
  userId,
  newAddonCount,
  newAddonSubIds,
  baseCapsuleCount,
  pending,
}: {
  subId: string;
  userId: string;
  newAddonCount: number;
  newAddonSubIds: string[];
  baseCapsuleCount: number;
  pending?: {
    plan: "MONTHLY" | "ANNUAL";
    subId: string;
    effectiveDate: Date;
  };
}) {
  const { prisma } = await import("@/lib/prisma");
  const newSlots = baseCapsuleCount + newAddonCount;

  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { id: subId },
      data: {
        addonCapsuleCount: newAddonCount,
        addonSquareSubIds: newAddonSubIds,
        ...(pending
          ? {
              pendingPlan: pending.plan,
              pendingSquareSubId: pending.subId,
              pendingEffectiveDate: pending.effectiveDate,
            }
          : {}),
      },
    });

    const activeVaults = await tx.vault.findMany({
      where: {
        child: { parentId: userId },
        isLocked: false,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    const overQuota = activeVaults.length - newSlots;
    if (overQuota > 0) {
      const toLock = activeVaults.slice(0, overQuota).map((v) => v.id);
      await tx.vault.updateMany({
        where: { id: { in: toLock } },
        data: { isLocked: true, lockedAt: new Date() },
      });
    }
  });
}
