import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";

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
    data: { approvalStatus: "REJECTED" },
    include: { capsule: { select: { id: true, title: true } } },
  });

  await logAdminAction(
    req,
    "contribution.reject",
    { type: "CapsuleContribution", id: contribution.id },
    { capsuleId: contribution.capsule.id, capsuleTitle: contribution.capsule.title },
  );

  try {
    if (contribution.authorEmail) {
      const { sendContributorRejected } = await import("@/lib/capsule-emails");
      const invite = await prisma.capsuleInvite.findFirst({
        where: { capsuleId: contribution.capsule.id, email: contribution.authorEmail },
        select: { inviteToken: true },
      });
      const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://untilthenapp.io";
      await sendContributorRejected({
        to: contribution.authorEmail,
        contributorName: contribution.authorName,
        capsuleTitle: contribution.capsule.title,
        editUrl: invite ? `${origin}/contribute/capsule/${invite.inviteToken}` : origin,
      });
    }
  } catch (err) {
    console.error("[admin reject] email failed:", err);
  }

  return NextResponse.json({ success: true });
}
