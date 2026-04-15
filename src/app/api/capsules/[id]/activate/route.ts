import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { findOwnedCapsule, RECIPIENT_TOKEN_TTL_MS } from "@/lib/capsules";
import {
  sendCapsuleActivated,
  sendCapsuleInvite,
} from "@/lib/capsule-emails";
import { captureServerEvent } from "@/lib/posthog-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Activate a capsule once payment settles.
 *
 * TODO: Square payment — $9.99 one-time. Until Square is wired
 * up, any authenticated organiser can call this and the capsule
 * flips to ACTIVE. When Square lands, verify the payment on
 * the server before flipping `isPaid`.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  const { id } = await ctx.params;
  const owned = await findOwnedCapsule(userId ?? null, id);
  if (!owned.ok)
    return NextResponse.json({ error: "Not found." }, { status: owned.status });
  const capsule = owned.capsule;

  if (capsule.status !== "DRAFT" || capsule.isPaid) {
    return NextResponse.json({
      success: true,
      alreadyActive: true,
    });
  }

  // Body shape: { paymentId, recipientEmail?, recipientPhone? }.
  // Recipient contact is collected at the activation paywall
  // (deferred from creation) — at least one of email/phone must
  // be on the capsule by the time activation completes, so the
  // reveal-day message has somewhere to go.
  let paymentId: string | null = null;
  let incomingEmail: string | null | undefined;
  let incomingPhone: string | null | undefined;
  try {
    const body = (await req.json().catch(() => null)) as {
      paymentId?: unknown;
      recipientEmail?: unknown;
      recipientPhone?: unknown;
    } | null;
    if (body && typeof body.paymentId === "string" && body.paymentId.trim()) {
      paymentId = body.paymentId.trim();
    }
    if (body && typeof body.recipientEmail === "string") {
      const v = body.recipientEmail.trim().toLowerCase();
      incomingEmail = v || null;
    }
    if (body && typeof body.recipientPhone === "string") {
      const v = body.recipientPhone.trim();
      incomingPhone = v || null;
    }
  } catch {
    /* noop */
  }

  // Validate email format if provided.
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (incomingEmail && !EMAIL_RE.test(incomingEmail)) {
    return NextResponse.json(
      { error: "Please enter a valid recipient email." },
      { status: 400 },
    );
  }

  // Resolve the final contact state — prefer body, fall back to
  // whatever was already on the capsule. Then require at least
  // one channel before we charge / activate.
  const finalEmail =
    incomingEmail !== undefined ? incomingEmail : capsule.recipientEmail;
  const finalPhone =
    incomingPhone !== undefined ? incomingPhone : capsule.recipientPhone;
  if (!finalEmail && !finalPhone) {
    return NextResponse.json(
      {
        error:
          "Add a way to reach your recipient — an email or phone number — before activating.",
      },
      { status: 400 },
    );
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    // Token expiry is 30 days past the reveal date so the
    // recipient's magic link stays valid for a month after the
    // capsule opens.
    const tokenExpiresAt = new Date(
      capsule.revealDate.getTime() + RECIPIENT_TOKEN_TTL_MS,
    );

    // Atomic flip: capsule → ACTIVE + every STAGED invite →
    // PENDING. Doing both in one transaction means a partial
    // failure can't leave staged rows behind a paid capsule.
    // Recipient contact saves alongside so the reveal-day
    // dispatch has an address the moment the capsule is live.
    const [, stagedInvites] = await prisma.$transaction([
      prisma.memoryCapsule.update({
        where: { id },
        data: {
          status: "ACTIVE",
          isPaid: true,
          paymentId,
          tokenExpiresAt,
          recipientEmail: finalEmail,
          recipientPhone: finalPhone,
        },
      }),
      prisma.capsuleInvite.findMany({
        where: { capsuleId: id, status: "STAGED" },
      }),
      prisma.capsuleInvite.updateMany({
        where: { capsuleId: id, status: "STAGED" },
        data: { status: "PENDING" },
      }),
    ]);

    await captureServerEvent(userId ?? "anonymous", "capsule_activated", {
      capsuleId: id,
      invitesDispatched: stagedInvites.length,
    });

    // Now dispatch the invite emails for every freshly-promoted
    // STAGED row + the organiser's "you're live" confirmation.
    // Failures here are best-effort — the rows are already PENDING
    // so a resend can pick them up later.
    try {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId!);
      const organiserName = clerkUser.firstName ?? "Someone";
      const organiserEmail =
        clerkUser.primaryEmailAddress?.emailAddress ??
        clerkUser.emailAddresses[0]?.emailAddress;

      for (const invite of stagedInvites) {
        await sendCapsuleInvite({
          to: invite.email,
          contributorName: invite.name,
          organiserName,
          title: capsule.title,
          recipientName: capsule.recipientName,
          revealDate: capsule.revealDate,
          inviteToken: invite.inviteToken,
        });
      }

      if (organiserEmail) {
        const origin =
          process.env.NEXT_PUBLIC_APP_URL ?? "https://untilthenapp.io";
        await sendCapsuleActivated({
          to: organiserEmail,
          title: capsule.title,
          recipientName: capsule.recipientName,
          revealDate: capsule.revealDate,
          contributorCount: stagedInvites.length,
          dashboardUrl: `${origin}/capsules/${id}`,
        });
      }
    } catch (err) {
      console.error("[capsules activate] post-activate emails:", err);
    }

    // TODO: schedule the reveal-day email (sendCapsuleRevealDay)
    // to fire at capsule.revealDate. Needs a job runner /
    // scheduled Railway task — deferred for v1.
    console.log(
      `[capsules activate] reveal email pending for ${id} on ${capsule.revealDate.toISOString()}`,
    );

    return NextResponse.json({
      success: true,
      invitesDispatched: stagedInvites.length,
    });
  } catch (err) {
    console.error("[capsules activate] error:", err);
    return NextResponse.json(
      { error: "Couldn't activate the capsule." },
      { status: 500 },
    );
  }
}
