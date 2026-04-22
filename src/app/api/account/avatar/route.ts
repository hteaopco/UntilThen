import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
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
 * PATCH /api/account/avatar
 *
 * Called after a signed PUT to R2 has uploaded the cropped
 * circular headshot. Validates the key is under the caller's own
 * `users/{id}/` prefix, replaces the previous avatar (deleting
 * its object), and persists the new key on the User row.
 *
 * Returns a short-lived signed GET URL so the client can render
 * the new avatar immediately without round-tripping a page load.
 *
 * DELETE removes the avatar entirely.
 */
export async function PATCH(req: Request) {
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
  const key = typeof body.key === "string" ? body.key : "";
  if (!key) {
    return NextResponse.json({ error: "Missing key." }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");

  const self = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, avatarUrl: true },
  });
  if (!self) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  // Lock the key to the caller's own `users/{id}/` prefix so a
  // tampered client can't swap in someone else's object.
  const expectedPrefix = `${mediaKeyPrefix("userAvatar", self.id)}/photo/`;
  if (!key.startsWith(expectedPrefix)) {
    return NextResponse.json({ error: "Invalid key." }, { status: 400 });
  }

  const previousKey = self.avatarUrl;

  await prisma.user.update({
    where: { id: self.id },
    data: { avatarUrl: key },
  });

  if (previousKey && previousKey !== key) {
    deleteR2Object(previousKey).catch((err) => {
      console.warn("[account/avatar] could not delete old avatar:", err);
    });
  }

  revalidatePath("/account");
  revalidatePath("/dashboard");

  const viewUrl = await signGetUrl(key);
  return NextResponse.json({ success: true, viewUrl });
}

export async function DELETE() {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  const { prisma } = await import("@/lib/prisma");
  const self = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, avatarUrl: true },
  });
  if (!self) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const previousKey = self.avatarUrl;
  await prisma.user.update({
    where: { id: self.id },
    data: { avatarUrl: null },
  });
  if (previousKey && r2IsConfigured()) {
    deleteR2Object(previousKey).catch(() => {});
  }

  revalidatePath("/account");
  revalidatePath("/dashboard");
  return NextResponse.json({ success: true });
}
