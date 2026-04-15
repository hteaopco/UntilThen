import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { findOwnedCapsule } from "@/lib/capsules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Remove a contributor from a capsule. Used from the organiser
 * dashboard to drop a STAGED row before activation, or to revoke
 * a PENDING / ACTIVE invite afterward.
 *
 * The capsule's own contributions (CapsuleContribution) are not
 * touched — invites are the dispatch list, contributions are
 * the messages.
 */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; inviteId: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  const { id, inviteId } = await ctx.params;
  const owned = await findOwnedCapsule(userId ?? null, id);
  if (!owned.ok)
    return NextResponse.json({ error: "Not found." }, { status: owned.status });

  const { prisma } = await import("@/lib/prisma");
  const invite = await prisma.capsuleInvite.findUnique({
    where: { id: inviteId },
    select: { id: true, capsuleId: true },
  });
  if (!invite || invite.capsuleId !== id)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.capsuleInvite.delete({ where: { id: inviteId } });
  return NextResponse.json({ success: true });
}
