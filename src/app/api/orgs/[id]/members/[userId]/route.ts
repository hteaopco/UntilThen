import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { requireOrgRole } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PatchBody {
  role?: "ADMIN" | "MEMBER";
}

/**
 * PATCH /api/orgs/[id]/members/[userId]
 * Promote / demote between ADMIN and MEMBER. ADMIN+ only.
 *
 * Phase 1 doesn't allow promoting to OWNER through this route
 * (sole way to change OWNER is via /admin/orgs). It also blocks
 * any change to a row whose current role is OWNER — same
 * reason.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; userId: string }> },
): Promise<NextResponse> {
  const { userId: clerkId } = auth();
  if (!clerkId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 500 },
    );

  const { id: organizationId, userId: targetUserId } = await ctx.params;
  const orgCtx = await requireOrgRole(clerkId, organizationId, "ADMIN");
  if (!orgCtx)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (body.role !== "ADMIN" && body.role !== "MEMBER")
    return NextResponse.json(
      { error: "Role must be ADMIN or MEMBER." },
      { status: 400 },
    );

  const { prisma } = await import("@/lib/prisma");
  const target = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId: targetUserId },
    },
  });
  if (!target)
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  if (target.role === "OWNER")
    return NextResponse.json(
      { error: "OWNER role can only be changed via admin tooling." },
      { status: 403 },
    );

  await prisma.organizationMember.update({
    where: { id: target.id },
    data: { role: body.role },
  });

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/orgs/[id]/members/[userId]
 * Remove a member from the org. ADMIN+ only. Refuses to remove
 * an OWNER. Capsules made by this member that were
 * org-attributed are NOT auto-transferred — that's a separate
 * action (POST /api/orgs/[id]/capsules/[capsuleId]/transfer)
 * that only OWNER can do. Removing a member with attributed
 * capsules still leaves those capsules' organizationId set
 * (so they show up in legacy reporting), the member-link is
 * just severed.
 *
 * Per spec: capsules stay on the user's personal account
 * regardless. Removing them from the org doesn't delete
 * anything they made.
 */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; userId: string }> },
): Promise<NextResponse> {
  const { userId: clerkId } = auth();
  if (!clerkId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 500 },
    );

  const { id: organizationId, userId: targetUserId } = await ctx.params;
  const orgCtx = await requireOrgRole(clerkId, organizationId, "ADMIN");
  if (!orgCtx)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { prisma } = await import("@/lib/prisma");
  const target = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId: targetUserId },
    },
  });
  if (!target)
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  if (target.role === "OWNER")
    return NextResponse.json(
      { error: "OWNER cannot be removed from the org." },
      { status: 403 },
    );

  await prisma.organizationMember.delete({ where: { id: target.id } });

  return NextResponse.json({ success: true });
}
