import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { requireOrgRole } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/orgs/[id]/stats
 *
 * Aggregate metrics for the Stat Board on /enterprise. ADMIN+
 * only. Counts:
 *
 *   - Total org-attributed capsules + breakdown by status
 *     (DRAFT/ACTIVE/SEALED/REVEALED).
 *   - Total contributions across all org capsules + per-type
 *     breakdown (TEXT/PHOTO/VOICE/VIDEO).
 *   - Distinct recipients across all org capsules.
 *
 * Phase 1 returns a single snapshot; trend lines + per-month
 * charts can land later if we need them.
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
  const [byStatus, capsuleIdRows, distinctRecipients] = await Promise.all([
    prisma.memoryCapsule.groupBy({
      by: ["status"],
      where: { organizationId },
      _count: { _all: true },
    }),
    prisma.memoryCapsule.findMany({
      where: { organizationId },
      select: { id: true },
    }),
    prisma.memoryCapsule.findMany({
      where: { organizationId, recipientEmail: { not: null } },
      distinct: ["recipientEmail"],
      select: { id: true },
    }),
  ]);

  const capsuleIds = capsuleIdRows.map((r) => r.id);
  const totalCapsules = capsuleIdRows.length;

  let contribByType: { type: string; count: number }[] = [];
  let totalContributions = 0;
  if (capsuleIds.length > 0) {
    const grouped = await prisma.capsuleContribution.groupBy({
      by: ["type"],
      where: {
        capsuleId: { in: capsuleIds },
        approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] },
      },
      _count: { _all: true },
    });
    contribByType = grouped.map((g) => ({
      type: g.type,
      count: g._count._all,
    }));
    totalContributions = grouped.reduce((acc, g) => acc + g._count._all, 0);
  }

  const statusCounts = {
    DRAFT: 0,
    ACTIVE: 0,
    SEALED: 0,
    REVEALED: 0,
  } as Record<string, number>;
  for (const s of byStatus) statusCounts[s.status] = s._count._all;

  return NextResponse.json({
    totalCapsules,
    statusCounts,
    totalContributions,
    contributionsByType: {
      TEXT: 0,
      PHOTO: 0,
      VOICE: 0,
      VIDEO: 0,
      ...Object.fromEntries(contribByType.map((r) => [r.type, r.count])),
    },
    distinctRecipients: distinctRecipients.length,
  });
}
