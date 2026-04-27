import { prisma } from "@/lib/prisma";

/**
 * Count items the dashboard "Updates" chip badge should advertise.
 * Must match the list rendered at /dashboard/updates exactly so
 * tapping the badge never lands on an empty inbox.
 *
 * Same query shape as the list:
 *  - approvalStatus PENDING_REVIEW only — items the organiser has
 *    to approve / reject. AUTO_APPROVED contributions don't need
 *    action and don't belong in a notification badge.
 *  - moderationState NOT in [SCANNING, FLAGGED] — SCANNING is in
 *    flight (resolves in seconds), FLAGGED is in /admin/moderation
 *    awaiting human review. Neither is something the organiser
 *    can act on yet.
 *  - capsule organiserId === user — only the user's own capsules.
 *    Wedding + enterprise capsules they own are included; both
 *    surfaces also flow into /dashboard/updates so the count and
 *    list stay aligned for them too.
 */
export async function countDashboardUpdates(userId: string): Promise<number> {
  return prisma.capsuleContribution.count({
    where: {
      approvalStatus: "PENDING_REVIEW",
      moderationState: { notIn: ["FLAGGED", "SCANNING"] },
      capsule: { organiserId: userId },
    },
  });
}
