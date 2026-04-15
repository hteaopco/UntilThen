import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { findOwnedCapsule } from "@/lib/capsules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Organiser approves a pending contribution on a
 * requiresApproval capsule. Moves it into the main list that
 * the recipient sees on reveal day.
 */
export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; contributionId: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  const { id, contributionId } = await ctx.params;
  const owned = await findOwnedCapsule(userId ?? null, id);
  if (!owned.ok)
    return NextResponse.json({ error: "Not found." }, { status: owned.status });

  const { prisma } = await import("@/lib/prisma");
  const contribution = await prisma.capsuleContribution.findUnique({
    where: { id: contributionId },
    select: { id: true, capsuleId: true },
  });
  if (!contribution || contribution.capsuleId !== id)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.capsuleContribution.update({
    where: { id: contributionId },
    data: { approvalStatus: "APPROVED" },
  });
  return NextResponse.json({ success: true });
}
