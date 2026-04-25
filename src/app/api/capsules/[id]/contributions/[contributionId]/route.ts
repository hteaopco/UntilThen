import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { findOwnedCapsule } from "@/lib/capsules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PatchBody {
  title?: string | null;
  body?: string;
  mediaUrls?: string[];
  mediaTypes?: string[];
}

async function loadOwnContribution(
  capsuleId: string,
  contributionId: string,
  clerkUserId: string,
) {
  const { prisma } = await import("@/lib/prisma");
  const contribution = await prisma.capsuleContribution.findUnique({
    where: { id: contributionId },
    select: {
      id: true,
      capsuleId: true,
      clerkUserId: true,
    },
  });
  if (!contribution || contribution.capsuleId !== capsuleId) return null;
  // Only the original author (the organiser) can edit / delete
  // their own contribution. Public contributions don't have a
  // clerkUserId so they can never be matched here.
  if (contribution.clerkUserId !== clerkUserId) return null;
  return contribution;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; contributionId: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  const { id, contributionId } = await ctx.params;
  const owned = await findOwnedCapsule(userId ?? null, id);
  if (!owned.ok)
    return NextResponse.json({ error: "Not found." }, { status: owned.status });
  if (owned.capsule.contributionsClosed)
    return NextResponse.json(
      { error: "This capsule is sealed. Unseal it to make changes." },
      { status: 410 },
    );

  const target = await loadOwnContribution(id, contributionId, userId!);
  if (!target)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  let payload: PatchBody;
  try {
    payload = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if ("title" in payload) {
    data.title =
      typeof payload.title === "string" && payload.title.trim()
        ? payload.title.trim()
        : null;
  }
  if (typeof payload.body === "string") {
    const trimmed = payload.body.trim();
    data.body = trimmed.length > 0 ? payload.body : null;
  }
  if (Array.isArray(payload.mediaUrls)) {
    data.mediaUrls = payload.mediaUrls.filter(
      (u): u is string => typeof u === "string",
    );
  }
  if (Array.isArray(payload.mediaTypes)) {
    data.mediaTypes = payload.mediaTypes.filter(
      (u): u is string => typeof u === "string",
    );
  }

  const { prisma } = await import("@/lib/prisma");
  await prisma.capsuleContribution.update({
    where: { id: contributionId },
    data,
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; contributionId: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  const { id, contributionId } = await ctx.params;
  const owned = await findOwnedCapsule(userId ?? null, id);
  if (!owned.ok)
    return NextResponse.json({ error: "Not found." }, { status: owned.status });
  if (owned.capsule.contributionsClosed)
    return NextResponse.json(
      { error: "This capsule is sealed. Unseal it to make changes." },
      { status: 410 },
    );

  const target = await loadOwnContribution(id, contributionId, userId!);
  if (!target)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { prisma } = await import("@/lib/prisma");
  await prisma.capsuleContribution.delete({ where: { id: contributionId } });
  return NextResponse.json({ success: true });
}
