import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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
 * PATCH /api/account/vaults/{id}/cover
 *
 * Called after a signed PUT to R2 has uploaded the cropped cover
 * image. Validates the key belongs to this vault, replaces the old
 * cover (deleting its object), and persists the new key. Returns a
 * short-lived signed GET URL so the client can render immediately
 * without re-fetching the dashboard.
 *
 * DELETE removes the cover entirely.
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

  const { id: vaultId } = await params;
  if (!vaultId) {
    return NextResponse.json({ error: "Missing vault id." }, { status: 400 });
  }

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

  // Lock the key to this vault's prefix so a compromised client
  // can't swap in an arbitrary object.
  const expectedPrefix = `${mediaKeyPrefix("vault", vaultId)}/photo/`;
  if (!key.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: "Invalid key." }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");

  const vault = await prisma.vault.findUnique({
    where: { id: vaultId },
    include: { child: { select: { parentId: true } } },
  });
  if (!vault)
    return NextResponse.json({ error: "Vault not found." }, { status: 404 });
  const parent = await prisma.user.findUnique({
    where: { id: vault.child.parentId },
    select: { clerkId: true },
  });
  if (parent?.clerkId !== userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const previousKey = vault.coverUrl;

  await prisma.vault.update({
    where: { id: vaultId },
    data: { coverUrl: key },
  });

  // Delete the previous cover asynchronously — failure here is
  // non-fatal, the orphan just wastes a few hundred KB.
  if (previousKey && previousKey !== key) {
    deleteR2Object(previousKey).catch((err) => {
      console.warn("[vaults/cover] could not delete old cover:", err);
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

  const { id: vaultId } = await params;
  if (!vaultId) {
    return NextResponse.json({ error: "Missing vault id." }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");
  const vault = await prisma.vault.findUnique({
    where: { id: vaultId },
    include: { child: { select: { parentId: true } } },
  });
  if (!vault)
    return NextResponse.json({ error: "Vault not found." }, { status: 404 });
  const parent = await prisma.user.findUnique({
    where: { id: vault.child.parentId },
    select: { clerkId: true },
  });
  if (parent?.clerkId !== userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const previousKey = vault.coverUrl;
  await prisma.vault.update({
    where: { id: vaultId },
    data: { coverUrl: null },
  });
  if (previousKey && r2IsConfigured()) {
    deleteR2Object(previousKey).catch(() => {});
  }
  return NextResponse.json({ success: true });
}
