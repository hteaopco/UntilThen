import { auth } from "@clerk/nextjs/server";
import { createHash } from "crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hashPin(pin: string): string {
  return createHash("sha256").update(pin).digest("hex");
}

export async function GET(): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json({ hasPin: false });

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { pinHash: true },
  });
  return NextResponse.json({ hasPin: Boolean(user?.pinHash) });
}

export async function POST(req: Request): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    pin?: string;
    newPin?: string;
    currentPin?: string;
  };

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, pinHash: true },
  });
  if (!user)
    return NextResponse.json({ error: "User not found." }, { status: 404 });

  if (body.action === "setup") {
    const pin = body.pin;
    if (!pin || !/^\d{4}$/.test(pin))
      return NextResponse.json({ error: "PIN must be 4 digits." }, { status: 400 });
    if (user.pinHash)
      return NextResponse.json({ error: "PIN already set. Use change instead." }, { status: 400 });

    await prisma.user.update({
      where: { id: user.id },
      data: { pinHash: hashPin(pin) },
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === "verify") {
    const pin = body.pin;
    if (!pin || !/^\d{4}$/.test(pin))
      return NextResponse.json({ error: "PIN must be 4 digits." }, { status: 400 });
    if (!user.pinHash)
      return NextResponse.json({ error: "No PIN set." }, { status: 400 });

    const valid = hashPin(pin) === user.pinHash;
    return NextResponse.json({ valid });
  }

  if (body.action === "change") {
    const { currentPin, newPin } = body;
    if (!currentPin || !newPin || !/^\d{4}$/.test(newPin))
      return NextResponse.json({ error: "Invalid PIN format." }, { status: 400 });
    if (!user.pinHash)
      return NextResponse.json({ error: "No PIN set." }, { status: 400 });
    if (hashPin(currentPin) !== user.pinHash)
      return NextResponse.json({ error: "Current PIN is wrong." }, { status: 403 });

    await prisma.user.update({
      where: { id: user.id },
      data: { pinHash: hashPin(newPin) },
    });
    return NextResponse.json({ success: true });
  }

  if (body.action === "reset") {
    await prisma.user.update({
      where: { id: user.id },
      data: { pinHash: null },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
