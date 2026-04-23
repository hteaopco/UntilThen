import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 365-day retention for admin audit log.
const RETENTION_DAYS = 365;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
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
}
