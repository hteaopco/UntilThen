import { NextResponse, type NextRequest } from "next/server";

import { r2IsConfigured, signGetUrl } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public: returns the data needed to drive the full reveal
 * experience for a wedding guest's *own* just-submitted
 * contribution. Same shape the recipient endpoint
 * (/api/reveal/[token]) returns, but scoped to a single
 * contribution so the preview shows only the previewer's entry.
 *
 * Auth model:
 *   - guestToken in the URL identifies the wedding capsule.
 *   - contributionId in the query identifies the row.
 *   - We verify the row belongs to that capsule. No Clerk auth —
 *     the guest never had an account; the token is the auth.
 *
 * Media URLs are pre-signed so the gallery / story-card screens
 * can render images, voice notes, and videos without an extra
 * round-trip per asset.
 */
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ guestToken: string }> },
): Promise<NextResponse> {
  const { guestToken } = await ctx.params;
  const url = new URL(req.url);
  const contributionId = url.searchParams.get("contributionId");
  if (!contributionId) {
    return NextResponse.json(
      { error: "Missing contributionId." },
      { status: 400 },
    );
  }

  const { prisma } = await import("@/lib/prisma");
  const capsule = await prisma.memoryCapsule.findUnique({
    where: { guestToken },
  });
  if (!capsule || capsule.occasionType !== "WEDDING") {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const contribution = await prisma.capsuleContribution.findUnique({
    where: { id: contributionId },
  });
  if (!contribution || contribution.capsuleId !== capsule.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const canSign = r2IsConfigured();
  const media: { kind: "photo" | "voice" | "video"; url: string }[] = [];
  if (canSign) {
    for (let i = 0; i < contribution.mediaUrls.length; i++) {
      const key = contribution.mediaUrls[i];
      const rawKind = contribution.mediaTypes[i];
      if (rawKind !== "photo" && rawKind !== "voice" && rawKind !== "video") {
        continue;
      }
      try {
        const signed = await signGetUrl(key);
        media.push({ kind: rawKind, url: signed });
      } catch {
        /* skip — not worth failing the whole preview */
      }
    }
  }

  return NextResponse.json({
    capsule: {
      id: capsule.id,
      title: capsule.title,
      recipientName: capsule.recipientName,
      occasionType: capsule.occasionType,
      tone: capsule.tone,
      revealDate: capsule.revealDate.toISOString(),
      // Preview is always treated as a fresh first-open so the
      // gate + entry + story phases all play. hasCompleted=false
      // keeps the cinematic intro running every time.
      isFirstOpen: true,
      hasCompleted: false,
    },
    contribution: {
      id: contribution.id,
      authorName: contribution.authorName,
      authorAvatarUrl: null,
      type: contribution.type,
      title: contribution.title,
      body: contribution.body,
      media,
      createdAt: contribution.createdAt.toISOString(),
    },
  });
}
