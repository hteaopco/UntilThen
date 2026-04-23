import { NextResponse, type NextRequest } from "next/server";

import { cronRoute } from "@/lib/cron-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 365-day retention for admin audit log.
const RETENTION_DAYS = 365;

export const POST = cronRoute(
  "prune-audit-log",
  async (): Promise<NextResponse> => {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Database not configured." },
        { status: 500 },
      );
    }

    const { prisma } = await import("@/lib/prisma");
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000);

    const { count } = await prisma.adminAuditLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    return NextResponse.json({
      success: true,
      deleted: count,
      cutoff: cutoff.toISOString(),
    });
  },
);
