import { NextResponse, type NextRequest } from "next/server";

import { tokenIsValid } from "@/lib/capsules";
import { captureServerEvent } from "@/lib/posthog-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public: recipient opens their capsule with a magic token.
 * Returns the capsule + contributions (approved only, so a
 * pending contribution never sneaks into the reveal).
 *
 * The first open also flips the capsule to REVEALED and stamps
 * firstOpenedAt so return visits can switch from the guided
 * sequence to the browseable list.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await ctx.params;
  const token = req.nextUrl.searchParams.get("t");
  if (!token)
    return NextResponse.json({ error: "Missing token." }, { status: 401 });

  const { prisma } = await import("@/lib/prisma");
  const capsule = await prisma.memoryCapsule.findUnique({
    where: { id },
    include: {
      contributions: {
        where: { approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] } },
        orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!capsule)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (capsule.accessToken !== token)
    return NextResponse.json({ error: "Invalid link." }, { status: 401 });
  if (!tokenIsValid(capsule))
    return NextResponse.json(
      { error: "This link has expired." },
      { status: 410 },
    );
  if (capsule.revealDate.getTime() > Date.now())
    return NextResponse.json(
      { error: "The capsule isn't open yet." },
      { status: 403 },
    );

  // First open — stamp and capture. Keeps the status transition
  // idempotent so repeat calls are safe.
  let isFirstOpen = false;
  if (!capsule.firstOpenedAt) {
    await prisma.memoryCapsule.update({
      where: { id },
      data: { firstOpenedAt: new Date(), status: "REVEALED" },
    });
    isFirstOpen = true;
    await captureServerEvent(`recipient:${id}`, "capsule_opened", {
      capsuleId: id,
      contributionCount: capsule.contributions.length,
    });
  }

  return NextResponse.json({
    capsule: {
      id: capsule.id,
      title: capsule.title,
      recipientName: capsule.recipientName,
      occasionType: capsule.occasionType,
      revealDate: capsule.revealDate.toISOString(),
      isFirstOpen,
      hasAccount: Boolean(capsule.recipientClerkId),
    },
    contributions: capsule.contributions.map((c) => ({
      id: c.id,
      authorName: c.authorName,
      type: c.type,
      body: c.body,
      mediaUrls: c.mediaUrls,
      mediaTypes: c.mediaTypes,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}
