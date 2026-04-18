import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PIN feature temporarily disabled — pinHash column is unmapped
// while Accelerate schema cache refreshes.

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ hasPin: false });
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json(
    { error: "PIN feature is temporarily unavailable. Please try again later." },
    { status: 503 },
  );
}
