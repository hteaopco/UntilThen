import { auth } from "@clerk/nextjs/server";
import { OccasionType } from "@prisma/client";
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CreateBody {
  title?: string;
  recipientName?: string;
  /** Optional at creation — captured at activation instead. */
  recipientEmail?: string | null;
  /** Optional at creation — captured at activation instead. */
  recipientPhone?: string | null;
  occasionType?: string;
  revealDate?: string;
  contributorDeadline?: string | null;
  requiresApproval?: boolean;
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
  const recipientPhone =
    typeof body.recipientPhone === "string" && body.recipientPhone.trim()
      ? body.recipientPhone.trim()
      : null;
  const occasionType = VALID_OCCASIONS.includes(
    body.occasionType as OccasionType,
  )
    ? (body.occasionType as OccasionType)
    : "OTHER";
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
        error: `Memory Capsules reveal within ${CAPSULE_MAX_HORIZON_DAYS} days. For longer timeframes, write into a child Vault instead.`,
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

    const capsule = await prisma.memoryCapsule.create({
      data: {
        organiserId: user.id,
        title,
        recipientName,
        recipientEmail,
        recipientPhone,
        occasionType,
        revealDate,
        contributorDeadline,
        requiresApproval,
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
