import { auth } from "@clerk/nextjs/server";
import { CapsuleTone, OccasionType } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  CAPSULE_MAX_HORIZON_DAYS,
  CAPSULE_MAX_HORIZON_MS,
} from "@/lib/capsules";
import { sendCapsuleDraftSaved } from "@/lib/capsule-emails";
import { captureServerEvent } from "@/lib/posthog-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_OCCASIONS: OccasionType[] = [
  "BIRTHDAY",
  "ANNIVERSARY",
  "RETIREMENT",
  "GRADUATION",
  "WEDDING",
  "OTHER",
];

const VALID_TONES: CapsuleTone[] = [
  "CELEBRATION",
  "GRATITUDE",
  "THINKING_OF_YOU",
  "ENCOURAGEMENT",
  "LOVE",
  "OTHER",
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CreateBody {
  title?: string;
  recipientName?: string;
  /** "her" | "him" | "them". Defaults to "them" if omitted. */
  recipientPronoun?: string | null;
  /** Optional at creation — captured at activation instead. */
  recipientEmail?: string | null;
  /** Second recipient email for couple capsules. Reveal-day mail
   *  delivers to both addresses when set. */
  recipient2Email?: string | null;
  /** Optional at creation — captured at activation instead. */
  recipientPhone?: string | null;
  occasionType?: string;
  tone?: string;
  revealDate?: string;
  contributorDeadline?: string | null;
  requiresApproval?: boolean;
  deliveryTime?: string | null;
  timezone?: string | null;
}

/**
 * Create a capsule shell (DRAFT). Free — no payment required
 * here. Activation happens later via
 * POST /api/capsules/[id]/activate once Square settles.
 */
export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const recipientName =
    typeof body.recipientName === "string" ? body.recipientName.trim() : "";
  // Recipient contact is optional here — collected at the
  // activation paywall instead. We still sanitise anything sent
  // so an organiser can pre-fill from the dashboard later without
  // a separate PATCH.
  const recipientEmail =
    typeof body.recipientEmail === "string" && body.recipientEmail.trim()
      ? body.recipientEmail.trim().toLowerCase()
      : null;
  if (recipientEmail && !EMAIL_RE.test(recipientEmail)) {
    return NextResponse.json(
      { error: "Please enter a valid recipient email." },
      { status: 400 },
    );
  }
  const recipient2Email =
    typeof body.recipient2Email === "string" && body.recipient2Email.trim()
      ? body.recipient2Email.trim().toLowerCase()
      : null;
  if (recipient2Email && !EMAIL_RE.test(recipient2Email)) {
    return NextResponse.json(
      { error: "Please enter a valid second recipient email." },
      { status: 400 },
    );
  }
  const recipientPhone =
    typeof body.recipientPhone === "string" && body.recipientPhone.trim()
      ? body.recipientPhone.trim()
      : null;
  const recipientPronoun =
    typeof body.recipientPronoun === "string" &&
    ["her", "him", "them"].includes(body.recipientPronoun.toLowerCase())
      ? body.recipientPronoun.toLowerCase()
      : null;
  const occasionType = VALID_OCCASIONS.includes(
    body.occasionType as OccasionType,
  )
    ? (body.occasionType as OccasionType)
    : "OTHER";
  const tone = VALID_TONES.includes(body.tone as CapsuleTone)
    ? (body.tone as CapsuleTone)
    : "CELEBRATION";
  const deliveryTime =
    typeof body.deliveryTime === "string" &&
    /^\d{2}:\d{2}$/.test(body.deliveryTime.trim())
      ? body.deliveryTime.trim()
      : undefined;
  const timezone =
    typeof body.timezone === "string" && body.timezone.trim()
      ? body.timezone.trim()
      : undefined;
  const revealDate =
    typeof body.revealDate === "string" ? new Date(body.revealDate) : null;
  const contributorDeadline =
    typeof body.contributorDeadline === "string" && body.contributorDeadline
      ? new Date(body.contributorDeadline)
      : null;
  const requiresApproval = body.requiresApproval === true;

  if (!title)
    return NextResponse.json(
      { error: "Please give the capsule a title." },
      { status: 400 },
    );
  if (!recipientName)
    return NextResponse.json(
      { error: "Who's the capsule for?" },
      { status: 400 },
    );
  if (!revealDate || Number.isNaN(revealDate.getTime()))
    return NextResponse.json(
      { error: "Please pick a reveal date." },
      { status: 400 },
    );
  if (revealDate.getTime() <= Date.now())
    return NextResponse.json(
      { error: "Reveal date must be in the future." },
      { status: 400 },
    );
  // Hard cap: capsules are short-horizon occasion products. Anything
  // past the window belongs in the child Vault.
  if (revealDate.getTime() - Date.now() > CAPSULE_MAX_HORIZON_MS) {
    return NextResponse.json(
      {
        error: `Gift Capsules reveal within ${CAPSULE_MAX_HORIZON_DAYS} days. For longer timeframes, write into a child Vault instead.`,
      },
      { status: 400 },
    );
  }
  if (
    contributorDeadline &&
    contributorDeadline.getTime() > revealDate.getTime()
  ) {
    return NextResponse.json(
      { error: "Contributor deadline must be on or before the reveal date." },
      { status: 400 },
    );
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, userType: true },
    });
    if (!user)
      return NextResponse.json({ error: "User not found." }, { status: 404 });

    // Org attribution — when the creator is an Organization
    // member, stamp the capsule with organizationId so it shows
    // up in the org's Stat Board + the offboarding transfer
    // flow. Per spec the capsule still belongs to the user's
    // personal account; the org link is purely backend metadata
    // and never user-visible.
    const { getOrgContextByUserId } = await import("@/lib/orgs");
    const orgCtx = await getOrgContextByUserId(user.id);

    const capsule = await prisma.memoryCapsule.create({
      data: {
        organiserId: user.id,
        title,
        recipientName,
        recipientPronoun,
        recipientEmail,
        recipient2Email,
        recipientPhone,
        occasionType,
        tone,
        revealDate,
        contributorDeadline,
        requiresApproval,
        ...(deliveryTime ? { deliveryTime } : {}),
        ...(timezone ? { timezone } : {}),
        ...(orgCtx ? { organizationId: orgCtx.organizationId } : {}),
      },
    });

    // Flip PARENT → BOTH when a vault owner creates their first
    // capsule. ORGANISER stays as-is (they started here).
    if (user.userType === "PARENT") {
      await prisma.user.update({
        where: { id: user.id },
        data: { userType: "BOTH" },
      });
    }

    await captureServerEvent(userId, "capsule_created", {
      capsuleId: capsule.id,
      occasionType,
    });

    // Fire-and-forget draft-saved confirmation so the organiser
    // has a link back into the flow if they close the tab.
    try {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId);
      const organiserEmail =
        clerkUser.primaryEmailAddress?.emailAddress ??
        clerkUser.emailAddresses[0]?.emailAddress;
      if (organiserEmail) {
        const origin =
          process.env.NEXT_PUBLIC_APP_URL ?? "https://untilthenapp.io";
        await sendCapsuleDraftSaved({
          to: organiserEmail,
          organiserName: clerkUser.firstName ?? "",
          title,
          dashboardUrl: `${origin}/capsules/${capsule.id}`,
        });
      }
    } catch (err) {
      console.error("[capsules POST] draft-saved email:", err);
    }

    return NextResponse.json({ success: true, id: capsule.id });
  } catch (err) {
    console.error("[capsules POST] error:", err);
    return NextResponse.json(
      { error: "Couldn't create the capsule." },
      { status: 500 },
    );
  }
}

/** List the signed-in organiser's capsules. */
export async function GET() {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json({ capsules: [] });

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!user) return NextResponse.json({ capsules: [] });

  const capsules = await prisma.memoryCapsule.findMany({
    where: { organiserId: user.id },
    include: {
      _count: { select: { contributions: true, invites: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ capsules });
}
