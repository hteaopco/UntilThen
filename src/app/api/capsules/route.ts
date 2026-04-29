import { auth } from "@clerk/nextjs/server";
import { CapsuleTone, OccasionType } from "@prisma/client";
import { NextResponse } from "next/server";

import {
  CAPSULE_MAX_HORIZON_DAYS,
  RECIPIENT_TOKEN_TTL_MS,
  WEDDING_MAX_HORIZON_DAYS,
  maxHorizonMsForOccasion,
} from "@/lib/capsules";
import { captureServerEvent } from "@/lib/posthog-server";
import {
  REVEAL_MIN_LEAD_MS,
  combineRevealMs,
} from "@/lib/reveal-schedule";

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

/**
 * Wedding guest tokens — short, URL-friendly, hard to guess.
 * Not cryptographic. 22 chars of base36 randomness ≈ 113 bits of
 * entropy, plenty for a guest-contribution QR that's printed on
 * a public table card.
 */
function randomGuestToken(): string {
  const a = Math.random().toString(36).slice(2);
  const b = Math.random().toString(36).slice(2);
  return (a + b).slice(0, 22);
}

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
  /** "personal" (default) → no organizationId stamped, even if
   *  the creator belongs to an org. "enterprise" → organizationId
   *  stamped (must match the creator's actual org). The signal
   *  comes from the create-flow entry point: visiting
   *  /capsules/new directly is always personal; coming through
   *  the /enterprise dashboard CTA passes attribution=enterprise.
   *  Never trust the client blindly — we still verify org
   *  membership before stamping. */
  attribution?: "personal" | "enterprise";
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
  // Validate the actual reveal moment (date + delivery time in
  // the chosen timezone) is at least REVEAL_MIN_LEAD_MS in the
  // future. This is what unlocks same-day reveals: comparing the
  // raw revealDate to Date.now() rejected today even when the
  // chosen delivery time was hours away, because revealDate is
  // parsed as UTC midnight. Falls back to UTC midnight when the
  // wizard hasn't supplied a delivery time / timezone yet (older
  // clients) so the legacy "future date" check still applies.
  const revealMomentMs =
    deliveryTime && timezone && typeof body.revealDate === "string"
      ? combineRevealMs(body.revealDate, deliveryTime, timezone)
      : revealDate.getTime();
  const minRevealMs = Date.now() + REVEAL_MIN_LEAD_MS;
  if (Number.isNaN(revealMomentMs) || revealMomentMs < minRevealMs) {
    return NextResponse.json(
      {
        error:
          "Reveal time must be at least 2 hours from now so you can finish staging the capsule.",
      },
      { status: 400 },
    );
  }
  // Hard cap: per-occasion ceiling. Standard Gift Capsules are
  // short-horizon (60 days); wedding capsules get a 600-day
  // window so the default 1-year-anniversary reveal works even
  // when the capsule is purchased months before the wedding.
  const horizonMs = maxHorizonMsForOccasion(occasionType);
  if (revealDate.getTime() - Date.now() > horizonMs) {
    const horizonDays =
      occasionType === "WEDDING"
        ? WEDDING_MAX_HORIZON_DAYS
        : CAPSULE_MAX_HORIZON_DAYS;
    const productLabel =
      occasionType === "WEDDING" ? "Wedding Capsules" : "Gift Capsules";
    return NextResponse.json(
      {
        error: `${productLabel} reveal within ${horizonDays} days. For longer timeframes, write into a child Vault instead.`,
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

    // Org attribution — only stamp organizationId when the
    // create flow explicitly says enterprise AND the creator
    // actually belongs to an org. Visiting /capsules/new
    // directly (consumer flow) always produces a personally-
    // attributed capsule, even for org members — so org members'
    // personal gifts don't leak into the org Stat Board /
    // offboarding transfer flow.
    //
    // The attribution signal lives in the URL: /capsules/new
    // (no source) → personal; /capsules/new?source=enterprise
    // (linked from the /enterprise dashboard CTA) → enterprise.
    // Threaded through page.tsx → CapsuleIntroGate →
    // CapsuleCreationFlow → POST body.
    //
    // We still verify membership here so a malicious client
    // can't claim enterprise attribution against someone else's
    // org by hand-crafting the request body.
    const wantsEnterprise = body.attribution === "enterprise";
    let orgCtx: Awaited<
      ReturnType<typeof import("@/lib/orgs").getOrgContextByUserId>
    > = null;
    if (wantsEnterprise) {
      const { getOrgContextByUserId } = await import("@/lib/orgs");
      orgCtx = await getOrgContextByUserId(user.id);
    }

    // Wedding capsules get an open guest token at creation time
    // so the organiser can print easel/table-card QR codes
    // immediately. Other occasions leave it null and rely on
    // per-contributor invites.
    const guestToken =
      occasionType === "WEDDING" ? randomGuestToken() : null;

    // Enterprise capsules skip the paywall (the org covers the
    // cost upstream), so we activate at creation time. That puts
    // the capsule in ACTIVE/isPaid immediately, lets the contributor
    // invite emails fire on save instead of waiting for a separate
    // /activate click, and matches the simplified enterprise UX
    // (no activate modal). Personal capsules still create as DRAFT
    // and flow through /activate + Square as before.
    const autoActivate = orgCtx !== null;
    const tokenExpiresAt = autoActivate
      ? new Date(revealDate.getTime() + RECIPIENT_TOKEN_TTL_MS)
      : null;
    const now = autoActivate ? new Date() : null;

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
        ...(guestToken ? { guestToken } : {}),
        ...(deliveryTime ? { deliveryTime } : {}),
        ...(timezone ? { timezone } : {}),
        ...(orgCtx ? { organizationId: orgCtx.organizationId } : {}),
        ...(autoActivate
          ? {
              status: "ACTIVE" as const,
              isPaid: true,
              paidAt: now,
              tokenExpiresAt,
            }
          : {}),
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
