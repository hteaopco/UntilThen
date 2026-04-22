import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { userHasCapsuleAccess } from "@/lib/paywall";
import {
  mediaKeyPrefix,
  r2IsConfigured,
  signGetUrl,
  type MediaKind,
  type MediaTarget,
} from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  /** New shape — explicit target + targetId. */
  target?: string;
  targetId?: string;
  /** Back-compat alias for the original entry-only callers. */
  entryId?: string;
  key?: string;
  kind?: string;
}

const VALID_KINDS: MediaKind[] = ["photo", "voice", "video"];
const VALID_TARGETS: MediaTarget[] = ["entry", "capsuleContribution"];

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  if (!r2IsConfigured()) {
    return NextResponse.json(
      { error: "Media storage is not configured yet." },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const target: MediaTarget = VALID_TARGETS.includes(body.target as MediaTarget)
    ? (body.target as MediaTarget)
    : "entry";
  const targetId =
    typeof body.targetId === "string" && body.targetId
      ? body.targetId
      : typeof body.entryId === "string"
        ? body.entryId
        : "";
  const key = typeof body.key === "string" ? body.key : "";
  const kind = VALID_KINDS.includes(body.kind as MediaKind)
    ? (body.kind as MediaKind)
    : null;
  if (!targetId || !key || !kind) {
    return NextResponse.json(
      { error: "Missing target id, key, or kind." },
      { status: 400 },
    );
  }
  // Key sanity: we require our own prefix so a bad actor can't
  // register arbitrary keys from outside the app. Prefix shape
  // is target-aware via mediaKeyPrefix().
  const expectedPrefix = `${mediaKeyPrefix(target, targetId)}/${kind}/`;
  if (!key.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: "Invalid key." }, { status: 400 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    if (target === "entry") {
      const entry = await prisma.entry.findUnique({ where: { id: targetId } });
      if (!entry)
        return NextResponse.json(
          { error: "Entry not found." },
          { status: 404 },
        );

      const author = await prisma.user.findUnique({
        where: { id: entry.authorId },
      });
      if (author?.clerkId !== userId) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }

      // Content paywall — mirrors the gate in /api/upload/sign.
      if (!(await userHasCapsuleAccess(author.id))) {
        return NextResponse.json(
          {
            error: "A subscription is required to add media.",
            needsSubscription: true,
          },
          { status: 402 },
        );
      }

      await prisma.entry.update({
        where: { id: targetId },
        data: {
          mediaUrls: { push: key },
          mediaTypes: { push: kind },
        },
      });
    } else {
      const contribution = await prisma.capsuleContribution.findUnique({
        where: { id: targetId },
        include: { capsule: { select: { organiserId: true } } },
      });
      if (!contribution)
        return NextResponse.json(
          { error: "Contribution not found." },
          { status: 404 },
        );
      if (contribution.clerkUserId !== userId) {
        const organiser = await prisma.user.findUnique({
          where: { id: contribution.capsule.organiserId },
          select: { clerkId: true },
        });
        if (organiser?.clerkId !== userId) {
          return NextResponse.json({ error: "Forbidden." }, { status: 403 });
        }
      }
      await prisma.capsuleContribution.update({
        where: { id: targetId },
        data: {
          mediaUrls: { push: key },
          mediaTypes: { push: kind },
        },
      });
    }

    const viewUrl = await signGetUrl(key);
    return NextResponse.json({ success: true, viewUrl });
  } catch (err) {
    console.error("[upload/complete] error:", err);
    return NextResponse.json(
      { error: "Couldn't record the upload." },
      { status: 500 },
    );
  }
}
