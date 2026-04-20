import { prisma } from "@/lib/prisma";

/**
 * Count items surfaced under the dashboard "Updates" chip. Today this
 * is the sum of:
 *  - capsule contributions awaiting the organiser's approval
 *  - recent contributions the organiser likely hasn't seen yet
 *
 * We don't track a per-contribution "seen" flag yet, so "recent" is a
 * 7-day rolling window over AUTO_APPROVED contributions. Good enough
 * for a v1 badge; tighten with a seenAt column if the count feels
 * noisy once real usage lands.
 */
export async function countDashboardUpdates(userId: string): Promise<number> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

  const [pendingReview, recentAuto] = await Promise.all([
    prisma.capsuleContribution.count({
      where: {
        approvalStatus: "PENDING_REVIEW",
        capsule: { organiserId: userId },
      },
    }),
    prisma.capsuleContribution.count({
      where: {
        approvalStatus: "AUTO_APPROVED",
        createdAt: { gte: sevenDaysAgo },
        capsule: { organiserId: userId },
        // Organiser's own contributions shouldn't count as updates.
        clerkUserId: null,
      },
    }),
  ]);

  return pendingReview + recentAuto;
}
