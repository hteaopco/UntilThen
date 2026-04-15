import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { findOwnedCapsule } from "@/lib/capsules";
import { sendCapsuleInvite } from "@/lib/capsule-emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface InviteBody {
  invites?: Array<{ email?: string; name?: string | null }>;
}

/**
 * Invite contributors for a capsule. The capsule must be paid
 * (activated) before invites can fire — this is the spec's
 * "pay before send" gate, checked server-side so the front end
 * can't bypass it.
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

  if (!capsule.isPaid || capsule.status === "DRAFT") {
    return NextResponse.json(
      { error: "Activate your capsule before sending invites." },
      { status: 402 },
    );
  }

  let body: InviteBody;
  try {
    body = (await req.json()) as InviteBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawInvites = Array.isArray(body.invites) ? body.invites : [];
  const normalised = rawInvites
    .map((i) => ({
      email:
        typeof i?.email === "string" ? i.email.trim().toLowerCase() : "",
      name:
        typeof i?.name === "string" && i.name.trim() ? i.name.trim() : null,
    }))
    .filter((i) => EMAIL_RE.test(i.email));

  if (normalised.length === 0)
    return NextResponse.json(
      { error: "Add at least one contributor email." },
      { status: 400 },
    );

  try {
    const { prisma } = await import("@/lib/prisma");

    // De-dupe against existing invites for this capsule.
    const existing = await prisma.capsuleInvite.findMany({
      where: { capsuleId: id },
      select: { email: true },
    });
    const seen = new Set(existing.map((e) => e.email));
    const fresh = normalised.filter((i) => !seen.has(i.email));

    if (fresh.length === 0) {
      return NextResponse.json({
        success: true,
        skipped: normalised.length,
        created: 0,
      });
    }

    const organiser = await prisma.user.findUnique({
      where: { id: capsule.organiserId },
      select: { firstName: true },
    });
    const organiserName = organiser?.firstName ?? "Someone";

    // Persist, then fire email. Email failures are swallowed by
    // the send helper so a row without an email delivered isn't
    // fatal — we can resend later.
    const created = await prisma.$transaction(
      fresh.map((i) =>
        prisma.capsuleInvite.create({
          data: {
            capsuleId: id,
            email: i.email,
            name: i.name,
          },
        }),
      ),
    );

    for (const invite of created) {
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

    return NextResponse.json({
      success: true,
      created: created.length,
      skipped: normalised.length - created.length,
    });
  } catch (err) {
    console.error("[capsule invites POST] error:", err);
    return NextResponse.json(
      { error: "Couldn't send invites." },
      { status: 500 },
    );
  }
}
