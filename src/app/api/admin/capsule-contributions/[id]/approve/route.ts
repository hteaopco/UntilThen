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

  // Load first so we can branch on moderation state. Two outcomes:
  //   - If the item was FLAGGED by Hive: clearing it here does NOT
  //     publish the contribution. Instead we set moderationState
  //     back to PASS and leave approvalStatus=PENDING_REVIEW so the
  //     organiser sees it in their Updates inbox and makes the
  //     final call. That honours the "approving a flagged item
  //     makes it visible to the organiser" behaviour the product
  //     spec requires.
  //   - If the item was NOT flagged: existing admin behaviour —
  //     mark APPROVED directly, which bypasses the organiser and
  //     publishes the contribution to the capsule.
  const existing = await prisma.capsuleContribution.findUnique({
    where: { id },
    select: {
      id: true,
      authorName: true,
      authorEmail: true,
      moderationState: true,
      capsule: {
        select: { id: true, title: true, recipientName: true },
      },
    },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Contribution not found." },
      { status: 404 },
    );
  }

  const wasFlagged = existing.moderationState === "FLAGGED";

  const contribution = await prisma.capsuleContribution.update({
    where: { id },
    data: wasFlagged
      ? {
          moderationState: "PASS",
          approvalStatus: "PENDING_REVIEW",
        }
      : { approvalStatus: "APPROVED" },
    include: { capsule: { select: { id: true, title: true, recipientName: true } } },
  });

  await logAdminAction(
    req,
    wasFlagged ? "contribution.clear-flag" : "contribution.approve",
    { type: "CapsuleContribution", id: contribution.id },
    {
      capsuleId: contribution.capsule.id,
      capsuleTitle: contribution.capsule.title,
      wasFlagged,
    },
  );

  // Approval email only fires for true approvals (published).
  // Flagged-then-cleared items go back to the organiser pipeline;
  // the contributor shouldn't get a "your message is in" email
  // until the organiser also approves.
  if (!wasFlagged) {
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
  }

  return NextResponse.json({ success: true, clearedFlag: wasFlagged });
}
