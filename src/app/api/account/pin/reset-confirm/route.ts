import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { hashResetToken } from "@/lib/pin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/account/pin/reset-confirm
 *
 * Called by /account/pin/reset?token=... — validates the one-time
 * token against the hash stored on the User row, clears pinHash
 * + token fields, and returns success. The user can then set a
 * fresh PIN from /account settings (or the gate stays off if
 * they don't).
 *
 * Token must: match the stored hash, not be expired, and belong
 * to the signed-in user. All failures surface as 400 with no
 * extra detail — no point giving an attacker signal on which
 * condition failed.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 500 },
    );
  }

  let body: { token?: unknown };
  try {
    body = (await req.json()) as { token?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token : "";
  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: {
      id: true,
      pinResetTokenHash: true,
      pinResetExpires: true,
    },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  if (!user.pinResetTokenHash || !user.pinResetExpires) {
    return NextResponse.json(
      { error: "Invalid or used link." },
      { status: 400 },
    );
  }
  if (user.pinResetExpires.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "This link has expired. Request a new one." },
      { status: 400 },
    );
  }
  if (hashResetToken(token) !== user.pinResetTokenHash) {
    return NextResponse.json(
      { error: "Invalid or used link." },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      pinHash: null,
      pinResetTokenHash: null,
      pinResetExpires: null,
    },
  });

  return NextResponse.json({ success: true });
}
