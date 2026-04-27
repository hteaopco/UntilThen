import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { requireOrgRole } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/orgs/[id]/members
 *
 * Roster view for the OWNER + ADMINs. MEMBERs don't see the
 * roster (the dashboard's Roster + Stat Board surfaces only
 * render for ADMIN+). Returns one row per member with the
 * fields the table needs (name, email, role, joinedAt, capsule
 * count) plus any PENDING invites stitched in so admins can see
 * who's been invited but hasn't accepted yet.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId: clerkId } = auth();
  if (!clerkId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 500 },
    );

  const { id: organizationId } = await ctx.params;
  const orgCtx = await requireOrgRole(clerkId, organizationId, "ADMIN");
  if (!orgCtx)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { prisma } = await import("@/lib/prisma");
  const [members, pendingInvites] = await Promise.all([
    prisma.organizationMember.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
    }),
    prisma.organizationInvite.findMany({
      where: { organizationId, status: "PENDING" },
      orderBy: { invitedAt: "desc" },
    }),
  ]);

  // Per-member capsule counts (org-attributed only) for the
  // roster table's right-side metric. Mirrors the filter that
  // drives the enterprise dashboard's manage card
  // (loadEnterpriseCapsules in /enterprise/page.tsx) — non-WEDDING
  // org-attributed capsules. Including weddings here would inflate
  // the count past what the dashboard actually surfaces.
  const userIds = members.map((m) => m.user.id);
  const capsuleCounts =
    userIds.length === 0
      ? []
      : await prisma.memoryCapsule.groupBy({
          by: ["organiserId"],
          where: {
            organizationId,
            organiserId: { in: userIds },
            occasionType: { not: "WEDDING" },
          },
          _count: { _all: true },
        });
  const countByUserId = new Map(
    capsuleCounts.map((c) => [c.organiserId, c._count._all]),
  );

  return NextResponse.json({
    members: members.map((m) => ({
      memberId: m.id,
      userId: m.user.id,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      email: m.user.email,
      phone: m.user.phone,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
      capsuleCount: countByUserId.get(m.user.id) ?? 0,
    })),
    pendingInvites: pendingInvites.map((i) => ({
      inviteId: i.id,
      email: i.email,
      firstName: i.firstName,
      lastName: i.lastName,
      phone: i.phone,
      role: i.role,
      invitedAt: i.invitedAt.toISOString(),
    })),
  });
}
