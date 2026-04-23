import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { hashPin, isValidPin, verifyPin } from "@/lib/pin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vault PIN management — opt-in, off by default.
 *
 * GET  → { hasPin: boolean } — current state for the signed-in user
 * POST → { action: "setup" | "verify" | "change" | "disable", pin, newPin? }
 *
 * Setup / change / disable all require the caller to know the
 * current PIN when one is already set (prevents someone who
 * grabs an unlocked session from swapping the PIN).
 *
 * Verify never throws — a wrong PIN returns `{ valid: false }`
 * with status 200 so the client can shake + retry without a
 * fetch error.
 */

interface PostBody {
  action?: string;
  pin?: string;
  newPin?: string;
}

export async function GET(): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ hasPin: false });
  }
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { pinHash: true },
  });
  return NextResponse.json({ hasPin: Boolean(user?.pinHash) });
}

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

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, pinHash: true },
  });
  if (!user)
    return NextResponse.json({ error: "User not found." }, { status: 404 });

  const action = body.action;

  // ── setup: create the first PIN. Rejected if one already exists.
  if (action === "setup") {
    if (user.pinHash) {
      return NextResponse.json(
        { error: "A PIN is already set. Use 'change' instead." },
        { status: 400 },
      );
    }
    if (!isValidPin(body.pin)) {
      return NextResponse.json(
        { error: "PIN must be exactly 4 digits." },
        { status: 400 },
      );
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { pinHash: hashPin(body.pin) },
    });
    return NextResponse.json({ success: true });
  }

  // ── change: rotate PIN. Requires current PIN.
  if (action === "change") {
    if (!user.pinHash) {
      return NextResponse.json(
        { error: "No PIN set. Use 'setup' first." },
        { status: 400 },
      );
    }
    if (!isValidPin(body.pin) || !isValidPin(body.newPin)) {
      return NextResponse.json(
        { error: "PINs must be exactly 4 digits." },
        { status: 400 },
      );
    }
    if (!verifyPin(body.pin, user.pinHash)) {
      return NextResponse.json(
        { error: "Current PIN is wrong." },
        { status: 401 },
      );
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { pinHash: hashPin(body.newPin) },
    });
    return NextResponse.json({ success: true });
  }

  // ── disable: turn PIN off. Requires current PIN.
  if (action === "disable") {
    if (!user.pinHash) {
      return NextResponse.json({ success: true }); // already off
    }
    if (!isValidPin(body.pin) || !verifyPin(body.pin, user.pinHash)) {
      return NextResponse.json(
        { error: "Current PIN is wrong." },
        { status: 401 },
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

  // ── verify: unlock check. Always 200 so the client can retry.
  if (action === "verify") {
    if (!user.pinHash) {
      // Nothing to verify against — treat as "unlocked" since the
      // user has no PIN set.
      return NextResponse.json({ valid: true });
    }
    if (!isValidPin(body.pin)) {
      return NextResponse.json({ valid: false });
    }
    return NextResponse.json({
      valid: verifyPin(body.pin, user.pinHash),
    });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
