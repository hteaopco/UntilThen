// Shared Hive scan helpers for Time Capsule `Entry` rows. Same
// pattern as the capsule-contribution async flow in
// /api/contribute/capsule/[token]: respond fast, scan in the
// background, flip approvalStatus to PENDING_REVIEW when flagged
// so vault + reveal queries hide the row until an admin clears
// it in /admin/moderation.

import { Prisma } from "@prisma/client";

import { scanContribution } from "@/lib/hive";

export interface ScanEntryParams {
  entryId: string;
  body: string | null;
  mediaUrls: string[];
  mediaTypes: string[];
}

/**
 * Background Hive scan for a fresh or edited Entry. Errors are
 * caught + logged. If the update fails, the row stays in SCANNING
 * — the /api/cron/moderation-cleanup cron reclaims it to
 * FAILED_OPEN after 5 min and the entry becomes visible again
 * (fail-open).
 */
export async function scanEntryAsync(params: ScanEntryParams): Promise<void> {
  try {
    const scan = await scanContribution({
      body: params.body,
      mediaKeys: params.mediaUrls,
      mediaTypes: params.mediaTypes,
    });
    const flagged = scan.state === "FLAGGED";
    const { prisma } = await import("@/lib/prisma");
    await prisma.entry.update({
      where: { id: params.entryId },
      data: {
        moderationState: scan.state,
        moderationFlags:
          Object.keys(scan.flags).length > 0
            ? { flags: scan.flags, top: scan.rawTopClasses ?? [] }
            : Prisma.JsonNull,
        moderationRunAt: new Date(),
        ...(flagged ? { approvalStatus: "PENDING_REVIEW" as const } : {}),
      },
    });
  } catch (err) {
    console.error("[entry-moderation] scan update failed:", err);
  }
}
