import { NextResponse } from "next/server";

import { captureServerEvent } from "@/lib/posthog-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/reveal/{token}/complete
 *
 * Stamps MemoryCapsule.recipientCompletedAt the first time the
 * recipient finishes the guided sequence and reaches the gallery.
 *
 * The flag is what RevealExperience reads on subsequent loads to
 * skip Phase 1 and drop a returning visitor straight into the
 * gallery. Idempotent — a second POST is a no-op.
 *
 * Token validation mirrors GET /api/reveal/{token}: lookup by the
 * unique accessToken column, reject anything else.
 */
export async function POST(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await ctx.params;
  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");
  const capsule = await prisma.memoryCapsule.findUnique({
    where: { accessToken: token },
    select: { id: true, recipientCompletedAt: true },
  });
  if (!capsule) {
    return NextResponse.json(
      { error: "This capsule link isn't valid." },
      { status: 404 },
    );
  }

  if (capsule.recipientCompletedAt) {
    // Already done — return success so the client treats this as
    // idempotent and doesn't retry.
    return NextResponse.json({ success: true, alreadyCompleted: true });
  }

  await prisma.memoryCapsule.update({
    where: { id: capsule.id },
    data: { recipientCompletedAt: new Date() },
  });

  await captureServerEvent(`recipient:${capsule.id}`, "capsule_completed", {
    capsuleId: capsule.id,
  });

  return NextResponse.json({ success: true, alreadyCompleted: false });
}
