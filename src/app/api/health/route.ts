import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Liveness probe: must not depend on external services.
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
