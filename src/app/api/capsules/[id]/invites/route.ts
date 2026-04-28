import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { effectiveStatus, findOwnedCapsule } from "@/lib/capsules";
import { sendCapsuleInvite } from "@/lib/capsule-emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface InviteBody {
  invites?: Array<{
    email?: string;
    name?: string | null;
    /** Per-contributor approval toggle (optional; defaults to
     * the capsule's legacy requiresApproval if unspecified). */
    requiresApproval?: boolean;
  }>;
}

/**
 * Add contributors to a capsule.
 *
 * - Capsule is DRAFT  → rows land with status STAGED. No invite
 *   emails fire. They're held until /activate kicks them over
 *   to PENDING (and dispatches the emails).
 * - Capsule is ACTIVE → rows land with status PENDING and the
 *   invite email goes out immediately.
 *
 * Either path is safe to call multiple times — duplicates are
 * deduped against existing rows on email.
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

  const status = effectiveStatus(capsule);
  if (status === "SEALED" || status === "SENT" || status === "REVEALED") {
    return NextResponse.json(
      { error: "This capsule is no longer accepting new contributors." },
      { status: 410 },
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
      // If the caller didn't send a flag, fall back to the
      // capsule's legacy requiresApproval so older entry points
      // keep their behaviour until migrated.
      requiresApproval:
        typeof i?.requiresApproval === "boolean"
          ? i.requiresApproval
          : capsule.requiresApproval,
    }))
    .filter((i) => EMAIL_RE.test(i.email));

  if (normalised.length === 0)
    return NextResponse.json(
      { error: "Add at least one contributor email." },
      { status: 400 },
    );

  const shouldStage = capsule.status === "DRAFT" || !capsule.isPaid;

  try {
    const { prisma } = await import("@/lib/prisma");

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
        staged: shouldStage,
      });
    }

    const organiser = await prisma.user.findUnique({
      where: { id: capsule.organiserId },
      select: { firstName: true },
    });
    const organiserName = organiser?.firstName ?? "Someone";

    const created = await prisma.$transaction(
      fresh.map((i) =>
        prisma.capsuleInvite.create({
          data: {
            capsuleId: id,
            email: i.email,
            name: i.name,
            requiresApproval: i.requiresApproval,
            status: shouldStage ? "STAGED" : "PENDING",
          },
        }),
      ),
    );

    // Only dispatch invite emails for ACTIVE capsules. Staged
    // rows wait for the /activate transaction.
    if (!shouldStage) {
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
    }

    return NextResponse.json({
      success: true,
      created: created.length,
      skipped: normalised.length - created.length,
      staged: shouldStage,
    });
  } catch (err) {
    console.error("[capsule invites POST] error:", err);
    return NextResponse.json(
      { error: "Couldn't save contributors." },
      { status: 500 },
    );
  }
}
