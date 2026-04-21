import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Module-scoped warmth cache. First call triggers the probe and
// blocks. Subsequent calls short-circuit to an instant 200. On
// probe failure the cache is reset so Railway's next healthcheck
// retry can try again.
let warmed = false;
let warming: Promise<void> | null = null;

/**
 * Readiness probe.
 *
 * Why not trivial: Railway flips traffic to the new container the
 * moment this endpoint returns 200 for the first time. If we return
 * 200 on cold start, the next real request (dashboard, vault, etc.)
 * still pays the full cost of Clerk JWKS + Upstash handshake +
 * Prisma pool bring-up + Next.js JIT compilation. Users see a
 * stuck / stale page until a manual container restart.
 *
 * So: the first call blocks on a real warmup (Prisma ping +
 * middleware-warming internal fetches) and only returns 200 once
 * those succeed. Railway's healthcheckTimeout (100s) gives us
 * plenty of headroom. Subsequent calls are cached and instant.
 */
export async function GET() {
  if (warmed) {
    return NextResponse.json({ status: "ok", warm: true });
  }
  if (!warming) {
    warming = runWarmup()
      .then(() => {
        warmed = true;
      })
      .catch((err) => {
        console.warn("[health] warmup failed, will retry:", err);
        warming = null;
      });
  }
  await warming;
  if (warmed) {
    return NextResponse.json({ status: "ok", warm: true });
  }
  return NextResponse.json(
    { status: "warming" },
    { status: 503 },
  );
}

async function runWarmup(): Promise<void> {
  const startedAt = Date.now();
  console.log("[health] warmup started");

  // 1. Prisma ping — hot the connection pool so the first real
  // DB-touching request doesn't wait for a handshake.
  const { prisma } = await import("@/lib/prisma");
  const prismaStart = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  console.log(`[health] prisma ping ok (${Date.now() - prismaStart}ms)`);

  // 2. Touch the middleware-covered public routes so Clerk fetches
  // its JWKS, Upstash's rate-limit client opens its HTTP keep-alive,
  // and Next JITs the page modules. These calls go to ourselves
  // over loopback — settled() so a flaky single route doesn't keep
  // the whole container cold.
  const port = process.env.PORT ?? "3000";
  const host = `http://127.0.0.1:${port}`;
  const fetchStart = Date.now();
  const results = await Promise.allSettled([
    fetch(`${host}/`, { cache: "no-store", redirect: "manual" }),
    fetch(`${host}/sign-in`, { cache: "no-store", redirect: "manual" }),
    fetch(`${host}/dashboard`, { cache: "no-store", redirect: "manual" }),
  ]);
  const fetchMs = Date.now() - fetchStart;
  results.forEach((r, i) => {
    const path = ["/", "/sign-in", "/dashboard"][i];
    if (r.status === "fulfilled") {
      console.log(`[health] warm-fetch ${path} → ${r.value.status}`);
    } else {
      console.warn(`[health] warm-fetch ${path} FAILED:`, r.reason);
    }
  });
  console.log(
    `[health] warmup complete in ${Date.now() - startedAt}ms ` +
      `(prisma + ${fetchMs}ms loopback)`,
  );
}
