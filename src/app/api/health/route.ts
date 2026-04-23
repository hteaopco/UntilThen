import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Trivial liveness probe: returns 200 the moment Next is listening.
// Railway flips traffic to the new container here, so keeping this
// fast and unconditional prevents deploys from failing on slow cold
// starts. Actual warmup (Prisma pool, JIT) runs in the background
// from instrumentation.ts.
export async function GET() {
  return NextResponse.json({ status: "ok" });
}
