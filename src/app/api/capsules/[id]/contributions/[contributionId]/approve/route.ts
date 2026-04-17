import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { findOwnedCapsule } from "@/lib/capsules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    include: { capsule: { select: { title: true, recipientName: true } } },
  });
  if (!contribution || contribution.capsuleId !== id)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.capsuleContribution.update({
    where: { id: contributionId },
    data: { approvalStatus: "APPROVED" },
  });

  try {
    const email = contribution.authorEmail;
    if (email) {
      const { sendContributorApproved } = await import("@/lib/capsule-emails");
      const invite = await prisma.capsuleInvite.findFirst({
        where: { capsuleId: id, email },
        select: { inviteToken: true },
      });
      const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://untilthenapp.io";
      await sendContributorApproved({
        to: email,
        contributorName: contribution.authorName,
        recipientName: contribution.capsule.recipientName,
        capsuleTitle: contribution.capsule.title,
        editUrl: invite ? `${origin}/contribute/capsule/${invite.inviteToken}` : origin,
      });
    }
  } catch (err) {
    console.error("[approve] email failed:", err);
  }

  return NextResponse.json({ success: true });
}
