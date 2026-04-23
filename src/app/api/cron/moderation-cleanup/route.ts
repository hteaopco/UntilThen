import { NextResponse, type NextRequest } from "next/server";

import { cronRoute } from "@/lib/cron-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Safety-net cron for the async moderation pipeline.
 *
 * Contributor submissions land in `moderationState: SCANNING`
 * and the Hive scan runs fire-and-forget in the background.
 * If the server restarts mid-scan (deploy, crash, OOM) the row
 * never moves past SCANNING on its own — organiser + reveal
 * views hide it, and it effectively disappears.
 *
 * This cron runs every 5 minutes and re-claims any row that's
 * been stuck in SCANNING for more than STUCK_MINUTES. We mark
 * them FAILED_OPEN so they flow through to the organiser (same
 * fail-open behaviour Hive API failures get). The admin can
 * rescan manually later if they want.
 *
 * Intentionally generous: a cold Hive endpoint + large image can
 * take up to 10s legitimately, so STUCK_MINUTES is set to 5 to
 * avoid racing in-flight scans.
 */

const STUCK_MINUTES = 5;

export const POST = cronRoute(
  "moderation-cleanup",
  async (): Promise<NextResponse> => {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Database not configured." },
        { status: 500 },
      );
    }

    const { prisma } = await import("@/lib/prisma");
    const cutoff = new Date(Date.now() - STUCK_MINUTES * 60_000);

    const { count } = await prisma.capsuleContribution.updateMany({
      where: {
        moderationState: "SCANNING",
        createdAt: { lt: cutoff },
      },
      data: {
        moderationState: "FAILED_OPEN",
        moderationRunAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      reclaimed: count,
      cutoff: cutoff.toISOString(),
    });
  },
);
