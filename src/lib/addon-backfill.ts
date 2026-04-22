import { SQUARE_PLAN_IDS, getSquareClient } from "@/lib/square";

/**
 * Lazy backfill for Subscription.addonSquareSubIds.
 *
 * Older addon subscriptions (purchased before we started
 * storing the Square sub id on each buy) live only in Square.
 * This helper lists the customer's Square subscriptions, filters
 * for addon plan variations, and writes the ids back into our
 * Subscription row. Runs at most once per user — subsequent
 * reads see a populated array and skip the Square round-trip.
 *
 * No-ops safely when:
 *   - the user has no subscription or no Square customer
 *   - addonCapsuleCount is 0 (nothing to link)
 *   - addonSquareSubIds already has entries (backfill already ran)
 */
export async function backfillAddonSquareSubIds(userId: string): Promise<void> {
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      squareCustomerId: true,
      subscription: {
        select: {
          id: true,
          addonCapsuleCount: true,
          addonSquareSubIds: true,
        },
      },
    },
  });
  const sub = user?.subscription;
  if (!sub) return;
  if (sub.addonCapsuleCount === 0) return;
  if (sub.addonSquareSubIds.length >= sub.addonCapsuleCount) return;
  if (!user?.squareCustomerId) return;

  const square = getSquareClient();
  // Square's subscriptions.search returns all subs for a
  // customer. Filter by planVariationId to pull just the addon
  // ones (ignore the base subscription).
  const addonPlanIds = new Set([
    SQUARE_PLAN_IDS.MONTHLY_ADDON,
    SQUARE_PLAN_IDS.ANNUAL_ADDON,
  ]);

  try {
    const resp = await square.subscriptions.search({
      query: {
        filter: {
          customerIds: [user.squareCustomerId],
        },
      },
    });
    const subs = resp.subscriptions ?? [];
    const addonIds = subs
      .filter(
        (s) =>
          s.id &&
          s.planVariationId &&
          addonPlanIds.has(s.planVariationId) &&
          // Only active / billing-through subs — skip anything
          // already cancelled so we don't re-count a former addon.
          s.status !== "DEACTIVATED" &&
          s.status !== "CANCELED",
      )
      .map((s) => s.id!)
      // Newest last — we pop the last one when the user clicks
      // Remove, so chronological order is friendliest.
      .reverse();

    if (addonIds.length === 0) return;

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { addonSquareSubIds: addonIds },
    });
  } catch (err) {
    console.error("[addon-backfill] failed:", err);
  }
}
