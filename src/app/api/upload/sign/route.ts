import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  MEDIA_LIMITS,
  PHOTOS_PER_YEAR_LIMIT,
  buildMediaKey,
  r2IsConfigured,
  signPutUrl,
  type MediaKind,
} from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  entryId?: string;
  kind?: string;
  contentType?: string;
  filename?: string;
  size?: number;
}

const VALID_KINDS: MediaKind[] = ["photo", "voice", "video"];

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

  const entryId = typeof body.entryId === "string" ? body.entryId : "";
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

  if (!entryId || !kind || !contentType) {
    return NextResponse.json(
      { error: "Missing entryId, kind, or contentType." },
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

    // Who owns this entry? Parent (authorId) or contributor (clerkUserId).
    const entry = await prisma.entry.findUnique({
      where: { id: entryId },
      include: { vault: true, contributor: true },
    });
    if (!entry)
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });

    const author = await prisma.user.findUnique({ where: { id: entry.authorId } });
    const isOwner = author?.clerkId === userId;
    const isContributor = entry.contributor?.clerkUserId === userId;
    if (!isOwner && !isContributor) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
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

    const key = buildMediaKey({ entryId, kind, filename });
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
