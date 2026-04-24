import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin approve for a Time Capsule entry.
 *
 * Branches on moderationState, mirroring the capsule-contribution
 * approve flow:
 *   FLAGGED  → clear the flag (moderationState=PASS) and set
 *              approvalStatus=AUTO_APPROVED so the entry returns
 *              to the parent's vault + reveal surfaces. The author
 *              is also the organiser here, so there's no secondary
 *              review step — a clean scan is enough.
 *   Other    → standard admin approve (approvalStatus=APPROVED).
 *              Typically only relevant for legacy manually-queued
 *              entries since vault entries normally ship AUTO_APPROVED.
 *
 * Audit log records contribution.clear-flag vs entry.approve so
 * the two paths stay distinguishable in the admin audit trail.
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
  const existing = await prisma.entry.findUnique({
    where: { id },
    select: {
      id: true,
      vaultId: true,
      moderationState: true,
    },
  });
  if (!existing)
    return NextResponse.json({ error: "Entry not found." }, { status: 404 });

  const wasFlagged = existing.moderationState === "FLAGGED";

  await prisma.entry.update({
    where: { id },
    data: wasFlagged
      ? {
          moderationState: "PASS",
          approvalStatus: "AUTO_APPROVED",
        }
      : { approvalStatus: "APPROVED" },
  });

  await logAdminAction(
    req,
    wasFlagged ? "entry.clear-flag" : "entry.approve",
    { type: "Entry", id: existing.id },
    { vaultId: existing.vaultId, wasFlagged },
  );

  return NextResponse.json({ success: true, clearedFlag: wasFlagged });
}
