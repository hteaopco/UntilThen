import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { requireOrgRole } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/orgs/[id]/capsules
 *
 * Lists every org-attributed capsule. ADMIN+ only — MEMBERs
 * only ever see their own capsules elsewhere in the app.
 *
 * Query: ?organiserId=<userId> filters to a single member's
 * org-capsules (used by the offboarding flow when the OWNER
 * needs to pick which member's capsules to transfer).
 *
 * Returned shape is intentionally minimal — title, recipient
 * name, status, dates, organiser id+name. Per spec ADMINs are
 * view-only on these; the transfer action lives at a separate
 * OWNER-only POST endpoint.
 */
export async function GET(
  req: NextRequest,
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

  const url = new URL(req.url);
  const organiserId = url.searchParams.get("organiserId") || undefined;

  const { prisma } = await import("@/lib/prisma");
  const capsules = await prisma.memoryCapsule.findMany({
    where: {
      organizationId,
      ...(organiserId ? { organiserId } : {}),
    },
    select: {
      id: true,
      title: true,
      recipientName: true,
      status: true,
      revealDate: true,
      createdAt: true,
      organiserId: true,
      organiser: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    capsules: capsules.map((c) => ({
      id: c.id,
      title: c.title,
      recipientName: c.recipientName,
      status: c.status,
      revealDate: c.revealDate.toISOString(),
      createdAt: c.createdAt.toISOString(),
      organiserId: c.organiserId,
      organiserName: `${c.organiser.firstName} ${c.organiser.lastName ?? ""}`.trim(),
      organiserEmail: c.organiser.email,
    })),
  });
}
