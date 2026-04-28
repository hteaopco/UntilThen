import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { userHasCapsuleAccess } from "@/lib/paywall";
import {
  MEDIA_LIMITS,
  PHOTOS_PER_YEAR_LIMIT,
  buildMediaKey,
  r2IsConfigured,
  signPutUrl,
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
  kind?: string;
  contentType?: string;
  filename?: string;
  size?: number;
}

const VALID_KINDS: MediaKind[] = ["photo", "voice", "video"];
const VALID_TARGETS: MediaTarget[] = [
  "entry",
  "capsuleContribution",
  "vault",
  "collection",
  "userAvatar",
];

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }
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

  // Resolve the target. If `target` isn't sent, fall back to the
  // legacy entry-only shape so existing callers (NewEntryForm,
  // contributor entry form) keep working unchanged.
  const target: MediaTarget = VALID_TARGETS.includes(body.target as MediaTarget)
    ? (body.target as MediaTarget)
    : "entry";
  const targetId =
    typeof body.targetId === "string" && body.targetId
      ? body.targetId
      : typeof body.entryId === "string"
        ? body.entryId
        : "";
  const kind = VALID_KINDS.includes(body.kind as MediaKind)
    ? (body.kind as MediaKind)
    : null;
  const contentType =
    typeof body.contentType === "string" ? body.contentType : "";
  const filename =
    typeof body.filename === "string" && body.filename
      ? body.filename
      : "upload";
  const size = typeof body.size === "number" ? body.size : 0;

  if (!targetId || !kind || !contentType) {
    return NextResponse.json(
      { error: "Missing target id, kind, or contentType." },
      { status: 400 },
    );
  }

  const limit = MEDIA_LIMITS[kind];
  if (!contentType.startsWith(limit.prefix)) {
    return NextResponse.json(
      { error: `Content-Type must start with ${limit.prefix}` },
      { status: 400 },
    );
  }
  if (size > limit.maxBytes) {
    return NextResponse.json(
      { error: `File too large. Max is ${limit.maxBytes / (1024 * 1024)}MB.` },
      { status: 413 },
    );
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    if (target === "entry") {
      const entry = await prisma.entry.findUnique({
        where: { id: targetId },
        include: { vault: true },
      });
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

      // Content paywall — adding media to an entry is a write
      // action. Mirrors the gate in /api/dashboard/entries.
      if (!(await userHasCapsuleAccess(author.id))) {
        return NextResponse.json(
          {
            error: "A subscription is required to add media.",
            needsSubscription: true,
          },
          { status: 402 },
        );
      }
      if (entry.vault?.isLocked) {
        return NextResponse.json(
          {
            error:
              "This capsule is locked. Unlock it or free up a slot to add media.",
            vaultLocked: true,
          },
          { status: 402 },
        );
      }

      // Photo quota — counted per vault per calendar year.
      if (kind === "photo") {
        const year = new Date().getFullYear();
        const yearStart = new Date(year, 0, 1);
        const photoCount = await prisma.entry.count({
          where: {
            vaultId: entry.vaultId,
            createdAt: { gte: yearStart },
            mediaTypes: { has: "photo" },
          },
        });
        if (photoCount >= PHOTOS_PER_YEAR_LIMIT) {
          return NextResponse.json(
            {
              error: `Annual photo limit reached (${PHOTOS_PER_YEAR_LIMIT}/year).`,
            },
            { status: 429 },
          );
        }
      }
    } else if (target === "capsuleContribution") {
      // capsuleContribution — only the contribution's own
      // organiser (matched via clerkUserId) can attach media.
      // Public contributions can't reach here because they
      // don't carry a clerkUserId.
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
        // organiserId is null when the original creator deleted
        // their account; nobody can claim organiser access in
        // that state, so a non-author sign attempt is rejected.
        const organiser = contribution.capsule.organiserId
          ? await prisma.user.findUnique({
              where: { id: contribution.capsule.organiserId },
              select: { clerkId: true },
            })
          : null;
        // Allow the capsule organiser to attach media to their
        // own contribution even if the row's clerkUserId hasn't
        // been backfilled (defensive).
        if (organiser?.clerkId !== userId) {
          return NextResponse.json({ error: "Forbidden." }, { status: 403 });
        }
      }
    } else if (target === "vault") {
      // vault — only the vault owner (child's parent) can upload a
      // cover. Covers are always "photo"; keep kind guard tight.
      if (kind !== "photo") {
        return NextResponse.json(
          { error: "Vault covers must be photos." },
          { status: 400 },
        );
      }
      const vault = await prisma.vault.findUnique({
        where: { id: targetId },
        include: { child: { select: { parentId: true } } },
      });
      if (!vault)
        return NextResponse.json(
          { error: "Vault not found." },
          { status: 404 },
        );
      const parent = await prisma.user.findUnique({
        where: { id: vault.child.parentId },
        select: { clerkId: true },
      });
      if (parent?.clerkId !== userId) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
    } else if (target === "collection") {
      // collection — only the vault owner (parent of the child this
      // collection belongs to) can upload a cover. Photo-only.
      if (kind !== "photo") {
        return NextResponse.json(
          { error: "Collection covers must be photos." },
          { status: 400 },
        );
      }
      const collection = await prisma.collection.findUnique({
        where: { id: targetId },
        include: { vault: { include: { child: { select: { parentId: true } } } } },
      });
      if (!collection)
        return NextResponse.json(
          { error: "Collection not found." },
          { status: 404 },
        );
      const parent = await prisma.user.findUnique({
        where: { id: collection.vault.child.parentId },
        select: { clerkId: true },
      });
      if (parent?.clerkId !== userId) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
    } else {
      // userAvatar — only the user themselves can upload their
      // own avatar. targetId must match the caller's User row id.
      if (kind !== "photo") {
        return NextResponse.json(
          { error: "Avatars must be photos." },
          { status: 400 },
        );
      }
      const self = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true },
      });
      if (!self || self.id !== targetId) {
        return NextResponse.json({ error: "Forbidden." }, { status: 403 });
      }
    }

    const key = buildMediaKey({ target, id: targetId, kind, filename });
    const uploadUrl = await signPutUrl(key, contentType);

    return NextResponse.json({ uploadUrl, key });
  } catch (err) {
    console.error("[upload/sign] error:", err);
    return NextResponse.json(
      { error: "Couldn't prepare the upload." },
      { status: 500 },
    );
  }
}
