import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PIN feature intentionally stubbed through soft launch.
// Schema column `User.pinHash` is live; reconstruct setup/verify/
// change/reset handlers and re-wire <VaultPinScreen /> in
// dashboard/layout.tsx when re-enabling.

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ hasPin: false, skipSetup: true });
}

export async function POST(): Promise<NextResponse> {
  return NextResponse.json({ success: true });
}
