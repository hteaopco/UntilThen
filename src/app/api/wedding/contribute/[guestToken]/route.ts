import { randomBytes } from "node:crypto";

import { EntryType, Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { effectiveStatus } from "@/lib/capsules";
import { sendCapsuleContributionSubmitted } from "@/lib/capsule-emails";
import { scanContribution } from "@/lib/hive";
import { captureServerEvent } from "@/lib/posthog-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES: EntryType[] = ["TEXT", "PHOTO", "VOICE", "VIDEO"];

/**
 * Public wedding guest-contribution flow.
 *
 * Distinct from /api/contribute/capsule/[token] (per-invite,
 * email-gated) — guest tokens are printed on a QR code at the
 * wedding so anyone who scans can contribute. There is no
 * CapsuleInvite row; the contribution stores authorName +
 * authorEmail straight from the form.
 *
 * Resolves only WEDDING capsules with a guestToken set. Other
 * occasions don't have one and 404 here cleanly.
 */
async function resolveByGuestToken(token: string) {
  const { prisma } = await import("@/lib/prisma");
  return prisma.memoryCapsule.findUnique({
    where: { guestToken: token },
    include: { organiser: { select: { id: true, clerkId: true } } },
  });
}

interface CapsuleSummary {
  id: string;
  title: string;
  recipientName: string;
  occasionType: string;
  revealDate: string;
  contributorDeadline: string | null;
  isPaid: boolean;
}

interface ContributionEditPayload {
  id: string;
  authorName: string;
  authorEmail: string | null;
  body: string | null;
  mediaUrls: string[];
  mediaTypes: string[];
}

/**
 * GET — fetches the capsule info a guest needs to render the
 * wedding-themed editor (couple names, reveal date, etc.). No
 * auth — any phone with the QR can read.
 *
 * When ?edit=<editToken> is present, also returns the matching
 * contribution so the form can re-render in edit mode pre-filled
 * with the original text + media. The editToken is the auth: only
 * the guest who originally submitted (and asked for an editable
 * link) holds the token. Non-matching tokens return the bare
 * capsule shape, no contribution leak.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ guestToken: string }> },
): Promise<
  NextResponse<
    | { capsule: CapsuleSummary; contribution?: ContributionEditPayload }
    | { error: string }
  >
> {
  const { guestToken } = await ctx.params;
  const capsule = await resolveByGuestToken(guestToken);
  if (!capsule)
    return NextResponse.json(
      { error: "This wedding capsule isn't recognized." },
      { status: 404 },
    );
  if (capsule.occasionType !== "WEDDING")
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const status = effectiveStatus(capsule);
  if (capsule.status === "DRAFT")
    return NextResponse.json(
      {
        error:
          "The couple hasn't activated this capsule yet. Try again in a moment.",
      },
      { status: 403 },
    );
  if (status === "REVEALED")
    return NextResponse.json(
      { error: "This capsule has already been opened." },
      { status: 410 },
    );
  if (status === "SENT")
    return NextResponse.json(
      { error: "This capsule has already been sent." },
      { status: 410 },
    );
  if (status === "SEALED")
    return NextResponse.json(
      { error: "This capsule is sealed — contributions are closed." },
      { status: 410 },
    );

  const editToken = req.nextUrl.searchParams.get("edit");
  let contribution: ContributionEditPayload | undefined;
  if (editToken) {
    const { prisma } = await import("@/lib/prisma");
    const row = await prisma.capsuleContribution.findUnique({
      where: { editToken },
    });
    if (row && row.capsuleId === capsule.id) {
      contribution = {
        id: row.id,
        authorName: row.authorName,
        authorEmail: row.authorEmail,
        body: row.body,
        mediaUrls: row.mediaUrls,
        mediaTypes: row.mediaTypes,
      };
    }
  }

  return NextResponse.json({
    capsule: {
      id: capsule.id,
      title: capsule.title,
      recipientName: capsule.recipientName,
      occasionType: capsule.occasionType,
      revealDate: capsule.revealDate.toISOString(),
      contributorDeadline: capsule.contributorDeadline?.toISOString() ?? null,
      isPaid: capsule.isPaid,
    },
    ...(contribution ? { contribution } : {}),
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
 * POST — submits a guest contribution. No invite flip (there's
 * no invite); we just create the CapsuleContribution row, kick
 * off async moderation + organiser-notify, and return.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ guestToken: string }> },
): Promise<NextResponse> {
  const { guestToken } = await ctx.params;
  const capsule = await resolveByGuestToken(guestToken);
  if (!capsule || capsule.occasionType !== "WEDDING")
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const status = effectiveStatus(capsule);
  if (capsule.status === "DRAFT" || status === "SEALED" || status === "SENT" || status === "REVEALED")
    return NextResponse.json(
      { error: "Contributions are closed for this capsule." },
      { status: 410 },
    );

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

  const authorEmail =
    typeof body.authorEmail === "string" && body.authorEmail.trim()
      ? body.authorEmail.trim().toLowerCase()
      : null;

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

  if (!text && mediaUrls.length === 0)
    return NextResponse.json(
      { error: "Add a message, a photo, or a voice note." },
      { status: 400 },
    );

  try {
    const { prisma } = await import("@/lib/prisma");
    const needsReview = capsule.requiresApproval;
    // Mint an unguessable per-row edit token. 24 random bytes
    // (~192 bits) base64url-encoded — not in PII, not in the URL
    // unless the guest opted into the editable-card email.
    const editToken = randomBytes(24).toString("base64url");
    const contribution = await prisma.capsuleContribution.create({
      data: {
        capsuleId: capsule.id,
        authorName,
        authorEmail,
        editToken,
        type,
        title:
          typeof body.title === "string" && body.title.trim()
            ? body.title.trim()
            : null,
        body: text,
        mediaUrls,
        mediaTypes,
        approvalStatus: needsReview ? "PENDING_REVIEW" : "AUTO_APPROVED",
        moderationState: "SCANNING",
      },
    });

    // capsule.organiser can be null when the original organiser
    // deleted their account — analytics + the organiser-notify
    // background job are best-effort, skip them in that case.
    const organiserClerkId = capsule.organiser?.clerkId ?? null;

    if (organiserClerkId) {
      await captureServerEvent(
        organiserClerkId,
        "wedding_guest_contribution_submitted",
        { capsuleId: capsule.id, type },
      );
    }

    if (organiserClerkId) {
      void processWeddingGuestContributionAsync({
        contributionId: contribution.id,
        capsuleId: capsule.id,
        capsuleTitle: capsule.title,
        organiserClerkId,
        authorName,
        text,
        mediaUrls,
        mediaTypes,
      });
    }

    return NextResponse.json({
      success: true,
      id: contribution.id,
      editToken,
    });
  } catch (err) {
    console.error("[wedding contribute POST] error:", err);
    return NextResponse.json(
      { error: "Couldn't save your contribution." },
      { status: 500 },
    );
  }
}

interface PatchBody {
  contributionId?: string;
  title?: string | null;
  body?: string | null;
  mediaUrls?: string[];
  mediaTypes?: string[];
}

/**
 * PATCH — lets a guest edit their own contribution within the
 * same browser session (the client holds the contributionId in
 * state). Validates the row belongs to the same capsule the
 * guestToken points at — an attacker swapping IDs hits 404.
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ guestToken: string }> },
): Promise<NextResponse> {
  const { guestToken } = await ctx.params;
  const capsule = await resolveByGuestToken(guestToken);
  if (!capsule || capsule.occasionType !== "WEDDING")
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const status = effectiveStatus(capsule);
  if (capsule.status === "DRAFT" || status === "SEALED" || status === "SENT" || status === "REVEALED")
    return NextResponse.json(
      { error: "Contributions are closed." },
      { status: 410 },
    );

  const body = (await req.json().catch(() => ({}))) as PatchBody;
  const contributionId =
    typeof body.contributionId === "string" ? body.contributionId : "";
  if (!contributionId)
    return NextResponse.json(
      { error: "Missing contributionId." },
      { status: 400 },
    );

  try {
    const { prisma } = await import("@/lib/prisma");
    const contribution = await prisma.capsuleContribution.findUnique({
      where: { id: contributionId },
    });
    if (!contribution || contribution.capsuleId !== capsule.id)
      return NextResponse.json(
        { error: "Contribution not found." },
        { status: 404 },
      );

    const needsReApproval = capsule.requiresApproval;
    const nextMediaUrls = Array.isArray(body.mediaUrls)
      ? body.mediaUrls
      : contribution.mediaUrls;
    const nextMediaTypes = Array.isArray(body.mediaTypes)
      ? body.mediaTypes
      : contribution.mediaTypes;
    const nextBody = body.body ?? contribution.body;

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

    void rescanWeddingContributionAsync({
      contributionId,
      text: nextBody,
      mediaUrls: nextMediaUrls,
      mediaTypes: nextMediaTypes,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[wedding contribute PATCH] error:", err);
    return NextResponse.json({ error: "Couldn't update." }, { status: 500 });
  }
}

async function processWeddingGuestContributionAsync(params: {
  contributionId: string;
  capsuleId: string;
  capsuleTitle: string;
  organiserClerkId: string;
  authorName: string;
  text: string | null;
  mediaUrls: string[];
  mediaTypes: string[];
}): Promise<void> {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://untilthenapp.io";

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
    console.error("[wedding contribute async] scan update failed:", err);
    return;
  }

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
      console.error("[wedding contribute async] organiser notify:", err);
    }
  }
}

async function rescanWeddingContributionAsync(params: {
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
    console.error("[wedding contribute async] rescan failed:", err);
  }
}
