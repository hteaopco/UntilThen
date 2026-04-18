import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PIN feature temporarily disabled — pinHash column is unmapped
// while Accelerate schema cache refreshes. Returns skipSetup so
// VaultPinScreen goes straight to unlocked.

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ hasPin: false, skipSetup: true });
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ success: true });
}
