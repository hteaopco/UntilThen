import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight check endpoint used by client code that wants to decide
// whether to show the onboarding form vs redirect to /dashboard.
// Most of the flow already checks server-side, but this is handy for
// client-driven navigation.
export async function GET() {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ onboarded: false });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ onboarded: false });
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    // Onboarded state flips once and never goes back, so a 60-second
    // edge cache is safe and saves a roundtrip on every navigation
    // that calls into the gate.
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
      cacheStrategy: { ttl: 60 },
    });
    return NextResponse.json({ onboarded: Boolean(user) });
  } catch (err) {
    console.error("[onboarding/check] error:", err);
    return NextResponse.json({ onboarded: false });
  }
}
