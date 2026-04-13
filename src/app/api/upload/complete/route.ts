import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { r2IsConfigured, signGetUrl, type MediaKind } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  entryId?: string;
  key?: string;
  kind?: string;
}

const VALID_KINDS: MediaKind[] = ["photo", "voice", "video"];

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

  const entryId = typeof body.entryId === "string" ? body.entryId : "";
  const key = typeof body.key === "string" ? body.key : "";
  const kind = VALID_KINDS.includes(body.kind as MediaKind)
    ? (body.kind as MediaKind)
    : null;
  if (!entryId || !key || !kind) {
    return NextResponse.json(
      { error: "Missing entryId, key, or kind." },
      { status: 400 },
    );
  }
  // Key sanity: we require our own prefix so a bad actor can't register
  // arbitrary keys from outside the app.
  if (!key.startsWith(`entries/${entryId}/${kind}/`)) {
    return NextResponse.json({ error: "Invalid key." }, { status: 400 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const entry = await prisma.entry.findUnique({
      where: { id: entryId },
      include: { contributor: true },
    });
    if (!entry)
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });

    const author = await prisma.user.findUnique({ where: { id: entry.authorId } });
    const isOwner = author?.clerkId === userId;
    const isContributor = entry.contributor?.clerkUserId === userId;
    if (!isOwner && !isContributor) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    await prisma.entry.update({
      where: { id: entryId },
      data: {
        mediaUrls: { push: key },
        mediaTypes: { push: kind },
      },
    });

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
