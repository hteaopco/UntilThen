import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { requireOrgRole } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DELETE /api/orgs/[id]/invites/[inviteId]
 *
 * Revoke a pending org invite. ADMIN+ on this org. The
 * OrganizationInvite row is hard-deleted so the magic-link
 * URL stops working immediately and the row drops off the
 * roster's "Invited" section. Re-inviting the same email
 * just creates a new PENDING row via POST /invites.
 */
export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; inviteId: string }> },
): Promise<NextResponse> {
  const { userId: clerkId } = auth();
  if (!clerkId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 500 },
    );

  const { id: organizationId, inviteId } = await ctx.params;
  const orgCtx = await requireOrgRole(clerkId, organizationId, "ADMIN");
  if (!orgCtx)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { prisma } = await import("@/lib/prisma");
  const invite = await prisma.organizationInvite.findUnique({
    where: { id: inviteId },
    select: { id: true, organizationId: true },
  });
  if (!invite || invite.organizationId !== organizationId)
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });

  await prisma.organizationInvite.delete({ where: { id: inviteId } });
  return NextResponse.json({ success: true });
}
