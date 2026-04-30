import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { findOwnedCapsule } from "@/lib/capsules";
import {
  deleteR2Object,
  mediaKeyPrefix,
  r2IsConfigured,
  signGetUrl,
} from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  key?: string;
}

/**
 * PATCH /api/capsules/{id}/cover
 *
 * Mirrors the vault + collection cover routes: called after a
 * signed PUT to R2 has uploaded the cover photo. Validates the key
 * belongs to this capsule, deletes the old cover object if any,
 * persists the new key on MemoryCapsule.coverUrl, and returns a
 * short-lived signed GET URL so the client can render the new
 * cover without an extra fetch.
 *
 * DELETE clears the cover.
 *
 * Auth: organiser-only (the same gate /api/upload/sign uses for
 * the capsuleCover target). Org-attributed capsules currently
 * stay organiser-scoped — revisit when org admins need cross-
 * member cover edits.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params;
  if (!id)
    return NextResponse.json(
      { error: "Missing capsule id." },
      { status: 400 },
    );

  const owned = await findOwnedCapsule(userId, id);
  if (!owned.ok)
    return NextResponse.json({ error: "Not found." }, { status: owned.status });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const key = typeof body.key === "string" ? body.key : "";
  if (!key) {
    return NextResponse.json({ error: "Missing key." }, { status: 400 });
  }

  const expectedPrefix = `${mediaKeyPrefix("capsuleCover", id)}/photo/`;
  if (!key.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: "Invalid key." }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");
  const previousKey = owned.capsule.coverUrl;

  await prisma.memoryCapsule.update({
    where: { id },
    data: { coverUrl: key },
  });

  if (previousKey && previousKey !== key) {
    deleteR2Object(previousKey).catch((err) => {
      console.warn("[capsules/cover] could not delete old cover:", err);
    });
  }

  const viewUrl = await signGetUrl(key);
  return NextResponse.json({ success: true, viewUrl });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );

  const { id } = await params;
  if (!id)
    return NextResponse.json(
      { error: "Missing capsule id." },
      { status: 400 },
    );

  const owned = await findOwnedCapsule(userId, id);
  if (!owned.ok)
    return NextResponse.json({ error: "Not found." }, { status: owned.status });

  const { prisma } = await import("@/lib/prisma");
  const previousKey = owned.capsule.coverUrl;

  await prisma.memoryCapsule.update({
    where: { id },
    data: { coverUrl: null },
  });

  if (previousKey && r2IsConfigured()) {
    deleteR2Object(previousKey).catch(() => {});
  }
  return NextResponse.json({ success: true });
}
