import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Readiness probe. Railway flips user traffic to this container the
// moment we return 200, so the handler does two things before it
// signals ready:
//
//   1. Block until the process has been up for MIN_UPTIME_MS. Even
//      though Next binds the port almost immediately, Clerk's JWKS,
//      Upstash's rate-limit client, and Prisma's connection pool
//      warm up AFTER the first bind — returning 200 before they
//      settle means the first real request eats the cold penalty
//      past Railway's edge timeout, which shows up as a 502.
//
//   2. Run a SELECT 1 through Prisma to prove DB connectivity.
//
// Until both conditions hold we return 503 so Railway keeps the old
// container in rotation and keeps polling. The 180s healthcheck
// timeout gives us ample margin.

const MIN_UPTIME_MS = 8_000;
const BOOT_AT = Date.now();

let readyOnce = false;

export async function GET() {
  if (readyOnce) {
    return NextResponse.json({ status: "ok", warm: true });
  }

  const uptimeMs = Date.now() - BOOT_AT;
  if (uptimeMs < MIN_UPTIME_MS) {
    return NextResponse.json(
      { status: "warming", uptimeMs, neededMs: MIN_UPTIME_MS },
      { status: 503 },
    );
  }

  const startedAt = Date.now();
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    readyOnce = true;
    console.log(
      `[health] ready — uptime=${Math.round(uptimeMs / 1000)}s, ` +
        `prisma=${Date.now() - startedAt}ms`,
    );
    return NextResponse.json({ status: "ok", warm: true });
  } catch (err) {
    console.error("[health] not ready:", err);
    return NextResponse.json(
      { status: "not-ready", error: (err as Error).message ?? "unknown" },
      { status: 503 },
    );
  }
}
