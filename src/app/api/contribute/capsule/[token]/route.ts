import { EntryType } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { effectiveStatus } from "@/lib/capsules";
import { sendCapsuleContributionSubmitted } from "@/lib/capsule-emails";
import { captureServerEvent } from "@/lib/posthog-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES: EntryType[] = ["TEXT", "PHOTO", "VOICE", "VIDEO"];

async function resolveInvite(token: string) {
  const { prisma } = await import("@/lib/prisma");
  return prisma.capsuleInvite.findUnique({
    where: { inviteToken: token },
    include: {
      capsule: {
        include: { organiser: { select: { id: true, clerkId: true } } },
      },
    },
  });
}

/**
 * Public: return the capsule info a contributor needs to write
 * their contribution. No auth — anyone with the invite link can
 * view. Drafts are explicitly hidden so a paused / unpaid capsule
 * can't leak a pre-launch preview.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await ctx.params;
  const invite = await resolveInvite(token);
  if (!invite)
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  const c = invite.capsule;
  const status = effectiveStatus(c);
  if (c.status === "DRAFT")
    return NextResponse.json({ error: "Capsule not active yet." }, { status: 403 });
  if (status === "REVEALED")
    return NextResponse.json(
      { error: "This capsule has already been opened." },
      { status: 410 },
    );
  if (status === "SEALED")
    return NextResponse.json(
      { error: "Contributions are closed for this capsule." },
      { status: 410 },
    );

  return NextResponse.json({
    invite: {
      id: invite.id,
      name: invite.name,
      email: invite.email,
      status: invite.status,
    },
    capsule: {
      id: c.id,
      title: c.title,
      recipientName: c.recipientName,
      occasionType: c.occasionType,
      revealDate: c.revealDate.toISOString(),
      contributorDeadline: c.contributorDeadline?.toISOString() ?? null,
      requiresApproval: c.requiresApproval,
    },
  });
}

interface SubmitBody {
  authorName?: string;
  authorEmail?: string;
  type?: string;
  body?: string;
  mediaUrls?: string[];
  mediaTypes?: string[];
}

/**
 * Public: submit a contribution. Marks the invite as ACTIVE on
 * first submission. Respects the capsule's requiresApproval —
 * PENDING_REVIEW vs AUTO_APPROVED is set here so the reveal flow
 * can filter cleanly.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await ctx.params;
  const invite = await resolveInvite(token);
  if (!invite)
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  const c = invite.capsule;
  const status = effectiveStatus(c);
  if (c.status === "DRAFT" || status === "SEALED" || status === "REVEALED") {
    return NextResponse.json(
      { error: "Contributions are closed for this capsule." },
      { status: 410 },
    );
  }

  let body: SubmitBody;
  try {
    body = (await req.json()) as SubmitBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const authorName =
    typeof body.authorName === "string" ? body.authorName.trim() : "";
  if (!authorName)
    return NextResponse.json(
      { error: "Please enter your name." },
      { status: 400 },
    );

  const type = VALID_TYPES.includes(body.type as EntryType)
    ? (body.type as EntryType)
    : "TEXT";
  const text =
    typeof body.body === "string" && body.body.trim() ? body.body : null;
  const mediaUrls = Array.isArray(body.mediaUrls)
    ? body.mediaUrls.filter((u): u is string => typeof u === "string")
    : [];
  const mediaTypes = Array.isArray(body.mediaTypes)
    ? body.mediaTypes.filter((u): u is string => typeof u === "string")
    : [];

  if (!text && mediaUrls.length === 0) {
    return NextResponse.json(
      { error: "Add a message, a photo, or a voice note." },
      { status: 400 },
    );
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    const contribution = await prisma.capsuleContribution.create({
      data: {
        capsuleId: c.id,
        authorName,
        authorEmail:
          typeof body.authorEmail === "string"
            ? body.authorEmail.trim().toLowerCase() || null
            : null,
        type,
        body: text,
        mediaUrls,
        mediaTypes,
        approvalStatus: c.requiresApproval
          ? "PENDING_REVIEW"
          : "AUTO_APPROVED",
      },
    });

    // Flip the invite to ACTIVE once the contributor hits submit
    // the first time. Keeps the organiser-side contributor list
    // honest without needing a separate "accept" step.
    if (invite.status !== "ACTIVE") {
      await prisma.capsuleInvite.update({
        where: { id: invite.id },
        data: { status: "ACTIVE", acceptedAt: new Date() },
      });
    }

    await captureServerEvent(
      c.organiser.clerkId,
      "capsule_contribution_submitted",
      { capsuleId: c.id, type },
    );

    // Fire-and-forget organiser notification. Uses the organiser
    // email lookup via Clerk — skip if we can't find it.
    try {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(c.organiser.clerkId);
      const organiserEmail =
        clerkUser.primaryEmailAddress?.emailAddress ??
        clerkUser.emailAddresses[0]?.emailAddress;
      if (organiserEmail) {
        const origin =
          process.env.NEXT_PUBLIC_APP_URL ?? "https://untilthenapp.io";
        await sendCapsuleContributionSubmitted({
          to: organiserEmail,
          contributorName: authorName,
          title: c.title,
          dashboardUrl: `${origin}/capsules/${c.id}`,
        });
      }
    } catch (err) {
      console.error("[capsule contribute] organiser notify:", err);
    }

    return NextResponse.json({ success: true, id: contribution.id });
  } catch (err) {
    console.error("[capsule contribute POST] error:", err);
    return NextResponse.json(
      { error: "Couldn't save your contribution." },
      { status: 500 },
    );
  }
}
