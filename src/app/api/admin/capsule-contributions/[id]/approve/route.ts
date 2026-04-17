import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = req.cookies.get("admin_auth")?.value;
  if (!process.env.ADMIN_PASSWORD || auth !== process.env.ADMIN_PASSWORD)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const { prisma } = await import("@/lib/prisma");
  const contribution = await prisma.capsuleContribution.update({
    where: { id },
    data: { approvalStatus: "APPROVED" },
    include: { capsule: { select: { id: true, title: true, recipientName: true } } },
  });

  try {
    if (contribution.authorEmail) {
      const { sendContributorApproved } = await import("@/lib/capsule-emails");
      const invite = await prisma.capsuleInvite.findFirst({
        where: { capsuleId: contribution.capsule.id, email: contribution.authorEmail },
        select: { inviteToken: true },
      });
      const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://untilthenapp.io";
      await sendContributorApproved({
        to: contribution.authorEmail,
        contributorName: contribution.authorName,
        recipientName: contribution.capsule.recipientName,
        capsuleTitle: contribution.capsule.title,
        editUrl: invite ? `${origin}/contribute/capsule/${invite.inviteToken}` : origin,
      });
    }
  } catch (err) {
    console.error("[admin approve] email failed:", err);
  }

  return NextResponse.json({ success: true });
}
