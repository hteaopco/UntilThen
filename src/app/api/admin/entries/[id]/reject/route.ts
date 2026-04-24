import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin reject for a Time Capsule entry. Sets approvalStatus to
 * REJECTED but leaves moderationState untouched (typically still
 * FLAGGED) so the audit trail preserves why the entry was
 * rejected. The entry stays invisible to vault + reveal via
 * both the approval-status and moderation-state filters.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const auth = req.cookies.get("admin_auth")?.value;
  if (!process.env.ADMIN_PASSWORD || auth !== process.env.ADMIN_PASSWORD)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 500 },
    );

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { prisma } = await import("@/lib/prisma");
  const entry = await prisma.entry.findUnique({
    where: { id },
    select: { id: true, vaultId: true, moderationState: true },
  });
  if (!entry)
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });

  await prisma.entry.update({
    where: { id },
    data: { approvalStatus: "REJECTED" },
  });

  await logAdminAction(
    req,
    "entry.reject",
    { type: "Entry", id: entry.id },
    { vaultId: entry.vaultId, wasFlagged: entry.moderationState === "FLAGGED" },
  );

  return NextResponse.json({ success: true });
}
