import { EntryType, Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { effectiveStatus } from "@/lib/capsules";
import { sendCapsuleContributionSubmitted } from "@/lib/capsule-emails";
import { scanContribution } from "@/lib/hive";
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
  title?: string;
  body?: string;
  mediaUrls?: string[];
  mediaTypes?: string[];
}

/**
 * Public: submit a contribution. Marks the invite as ACTIVE on
 * first submission. Respects the capsule's requiresApproval —
 * PENDING_REVIEW vs AUTO_APPROVED is set here so the reveal flow
 * can filter cleanly.
 *
 * Moderation runs ASYNC: the contribution is saved with
 * `moderationState: SCANNING` and we respond to the contributor
 * immediately. The actual Hive call happens in the background
 * and updates the row when it completes. Organiser + reveal views
 * hide SCANNING items until they resolve. The
 * /api/cron/moderation-cleanup cron safety-nets any rows stuck
 * in SCANNING for >5 min.
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

    const needsReview = invite.requiresApproval || c.requiresApproval;
    const contribution = await prisma.capsuleContribution.create({
      data: {
        capsuleId: c.id,
        authorName,
        authorEmail: invite.email ?? (
          typeof body.authorEmail === "string"
            ? body.authorEmail.trim().toLowerCase() || null
            : null
        ),
        type,
        title: typeof body.title === "string" && body.title.trim() ? body.title.trim() : null,
        body: text,
        mediaUrls,
        mediaTypes,
        approvalStatus: needsReview ? "PENDING_REVIEW" : "AUTO_APPROVED",
        // Start in SCANNING so organiser + reveal views hide it
        // until the background Hive scan resolves to PASS /
        // FLAGGED / FAILED_OPEN.
        moderationState: "SCANNING",
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

    // Fire-and-forget: scan + both notification emails. The Node
    // server on Railway stays alive after the response returns so
    // the background task runs to completion. If the process dies
    // mid-scan the cleanup cron reclaims the SCANNING row.
    void processContributionAsync({
      contributionId: contribution.id,
      capsuleId: c.id,
      capsuleTitle: c.title,
      recipientName: c.recipientName,
      organiserClerkId: c.organiser.clerkId,
      authorName,
      inviteEmail: invite.email,
      inviteToken: token,
      text,
      mediaUrls,
      mediaTypes,
    });

    return NextResponse.json({ success: true, id: contribution.id });
  } catch (err) {
    console.error("[capsule contribute POST] error:", err);
    return NextResponse.json(
      { error: "Couldn't save your contribution." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await ctx.params;
  const invite = await resolveInvite(token);
  if (!invite)
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });
  const c = invite.capsule;
  const status = effectiveStatus(c);
  if (c.status === "DRAFT" || status === "SEALED" || status === "REVEALED")
    return NextResponse.json({ error: "Contributions are closed." }, { status: 410 });

  const body = (await req.json().catch(() => ({}))) as {
    contributionId?: string;
    title?: string | null;
    body?: string | null;
    mediaUrls?: string[];
    mediaTypes?: string[];
  };

  const contributionId = typeof body.contributionId === "string" ? body.contributionId : "";
  if (!contributionId)
    return NextResponse.json({ error: "Missing contributionId." }, { status: 400 });

  try {
    const { prisma } = await import("@/lib/prisma");

    const contribution = await prisma.capsuleContribution.findUnique({
      where: { id: contributionId },
    });
    if (!contribution || contribution.capsuleId !== c.id)
      return NextResponse.json({ error: "Contribution not found." }, { status: 404 });

    const needsReApproval = invite.requiresApproval || c.requiresApproval;
    const nextMediaUrls = Array.isArray(body.mediaUrls) ? body.mediaUrls : contribution.mediaUrls;
    const nextMediaTypes = Array.isArray(body.mediaTypes) ? body.mediaTypes : contribution.mediaTypes;
    const nextBody = body.body ?? contribution.body;

    // Write the new content and flip moderationState back to
    // SCANNING so the re-scan happens async and we don't show
    // stale moderation results to organiser/reveal while the
    // rescan is in flight.
    await prisma.capsuleContribution.update({
      where: { id: contributionId },
      data: {
        title: body.title ?? contribution.title,
        body: nextBody,
        mediaUrls: nextMediaUrls,
        mediaTypes: nextMediaTypes,
        approvalStatus: needsReApproval
          ? "PENDING_REVIEW"
          : contribution.approvalStatus,
        moderationState: "SCANNING",
        moderationFlags: Prisma.JsonNull,
        moderationRunAt: null,
      },
    });

    // Fire-and-forget re-scan. No contributor/organiser notify
    // emails on edits — the first submit already sent those and
    // the product doesn't re-notify on revisions.
    void rescanContributionAsync({
      contributionId,
      text: nextBody,
      mediaUrls: nextMediaUrls,
      mediaTypes: nextMediaTypes,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[capsule contribute PATCH] error:", err);
    return NextResponse.json({ error: "Couldn't update." }, { status: 500 });
  }
}

/**
 * Background processor for a fresh contributor submission.
 *
 * Order of operations:
 *  1. Contributor confirmation email (fires first so the
 *     contributor gets their "thanks" mail fast — does not
 *     depend on scan result per product spec).
 *  2. Hive scan (up to ~10s per asset).
 *  3. Apply scan result to the contribution row: moderationState,
 *     moderationFlags, moderationRunAt. Force approvalStatus to
 *     PENDING_REVIEW when flagged, regardless of the capsule's
 *     requiresApproval.
 *  4. Organiser notification email — only when the item is not
 *     flagged. Flagged items go to /admin/moderation first; the
 *     organiser hears about them only once an admin clears the
 *     flag (at which point the existing updates-inbox flow picks
 *     them up).
 *
 * Errors inside this function are caught and logged; they never
 * propagate because we've already responded to the client.
 */
async function processContributionAsync(params: {
  contributionId: string;
  capsuleId: string;
  capsuleTitle: string;
  recipientName: string;
  organiserClerkId: string;
  authorName: string;
  inviteEmail: string | null;
  inviteToken: string;
  text: string | null;
  mediaUrls: string[];
  mediaTypes: string[];
}): Promise<void> {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://untilthenapp.io";

  // 1. Contributor confirmation email — fires regardless of
  //    scan outcome so the contributor experience matches the
  //    spec ("they see the normal thanks confirmation").
  if (params.inviteEmail) {
    try {
      const { sendContributorConfirmation } = await import("@/lib/capsule-emails");
      const bodyPreview = params.text
        ? params.text.replace(/<[^>]+>/g, " ").trim()
        : null;
      await sendContributorConfirmation({
        to: params.inviteEmail,
        contributorName: params.authorName,
        recipientName: params.recipientName,
        capsuleTitle: params.capsuleTitle,
        messagePreview: bodyPreview,
        editUrl: `${origin}/contribute/capsule/${params.inviteToken}`,
      });
    } catch (err) {
      console.error("[contribute async] contributor confirm:", err);
    }
  }

  // 2 + 3. Hive scan → apply result.
  let flagged = false;
  try {
    const scan = await scanContribution({
      body: params.text,
      mediaKeys: params.mediaUrls,
      mediaTypes: params.mediaTypes,
    });
    flagged = scan.state === "FLAGGED";
    const { prisma } = await import("@/lib/prisma");
    await prisma.capsuleContribution.update({
      where: { id: params.contributionId },
      data: {
        moderationState: scan.state,
        moderationFlags:
          Object.keys(scan.flags).length > 0
            ? { flags: scan.flags, top: scan.rawTopClasses ?? [] }
            : Prisma.JsonNull,
        moderationRunAt: new Date(),
        ...(flagged ? { approvalStatus: "PENDING_REVIEW" as const } : {}),
      },
    });
  } catch (err) {
    // Catastrophic: couldn't even write the scan result. Log and
    // let the cleanup cron reclaim the SCANNING row later.
    console.error("[contribute async] scan update failed:", err);
    return;
  }

  // 4. Organiser notification — skip for flagged items.
  if (!flagged) {
    try {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(params.organiserClerkId);
      const organiserEmail =
        clerkUser.primaryEmailAddress?.emailAddress ??
        clerkUser.emailAddresses[0]?.emailAddress;
      if (organiserEmail) {
        await sendCapsuleContributionSubmitted({
          to: organiserEmail,
          contributorName: params.authorName,
          title: params.capsuleTitle,
          dashboardUrl: `${origin}/capsules/${params.capsuleId}`,
        });
      }
    } catch (err) {
      console.error("[contribute async] organiser notify:", err);
    }
  }
}

/**
 * Background re-scan for a contributor edit. Lighter than the
 * fresh-submit processor — no emails, just the scan + update.
 */
async function rescanContributionAsync(params: {
  contributionId: string;
  text: string | null;
  mediaUrls: string[];
  mediaTypes: string[];
}): Promise<void> {
  try {
    const scan = await scanContribution({
      body: params.text,
      mediaKeys: params.mediaUrls,
      mediaTypes: params.mediaTypes,
    });
    const flagged = scan.state === "FLAGGED";
    const { prisma } = await import("@/lib/prisma");
    await prisma.capsuleContribution.update({
      where: { id: params.contributionId },
      data: {
        moderationState: scan.state,
        moderationFlags:
          Object.keys(scan.flags).length > 0
            ? { flags: scan.flags, top: scan.rawTopClasses ?? [] }
            : Prisma.JsonNull,
        moderationRunAt: new Date(),
        ...(flagged ? { approvalStatus: "PENDING_REVIEW" as const } : {}),
      },
    });
  } catch (err) {
    console.error("[contribute async] rescan failed:", err);
  }
}
