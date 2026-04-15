import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { findOwnedCapsule } from "@/lib/capsules";
import { deleteR2Object, r2IsConfigured } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Remove an uploaded media item from the organiser's capsule
 * contribution. Mirrors /api/entries/[id]/media/[index] for the
 * child-vault Entry model — same index-based slice + best-effort
 * R2 cleanup.
 */
export async function DELETE(
  _req: NextRequest,
  ctx: {
    params: Promise<{ id: string; contributionId: string; index: string }>;
  },
): Promise<NextResponse> {
  const { userId } = auth();
  const { id, contributionId, index } = await ctx.params;
  const owned = await findOwnedCapsule(userId ?? null, id);
  if (!owned.ok)
    return NextResponse.json({ error: "Not found." }, { status: owned.status });

  const idx = Number.parseInt(index, 10);
  if (Number.isNaN(idx) || idx < 0) {
    return NextResponse.json({ error: "Invalid index." }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");
  const contribution = await prisma.capsuleContribution.findUnique({
    where: { id: contributionId },
    select: {
      id: true,
      capsuleId: true,
      clerkUserId: true,
      mediaUrls: true,
      mediaTypes: true,
    },
  });
  if (!contribution || contribution.capsuleId !== id)
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  if (contribution.clerkUserId !== userId)
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  if (idx >= contribution.mediaUrls.length) {
    return NextResponse.json(
      { error: "Media index out of range." },
      { status: 400 },
    );
  }

  const key = contribution.mediaUrls[idx] ?? "";
  const nextUrls = [...contribution.mediaUrls];
  const nextTypes = [...contribution.mediaTypes];
  nextUrls.splice(idx, 1);
  nextTypes.splice(idx, 1);

  await prisma.capsuleContribution.update({
    where: { id: contributionId },
    data: {
      mediaUrls: { set: nextUrls },
      mediaTypes: { set: nextTypes },
    },
  });

  if (key && r2IsConfigured()) {
    try {
      await deleteR2Object(key);
    } catch (err) {
      console.error("[capsule contribution media DELETE] R2:", err);
    }
  }

  return NextResponse.json({ success: true });
}
