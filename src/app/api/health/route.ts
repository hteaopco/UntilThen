import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Readiness probe. Railway flips user traffic to this container
// the moment we return 200, so we WANT this call to block until
// the hot paths are warm — otherwise the first real request eats
// JIT + Clerk JWKS + Prisma handshake and Railway's edge proxy
// 502s after 15s.
//
// But we also can't block forever: if warmup stalls we need to
// bail and let Railway flip anyway, so the deploy doesn't fail.
// Hence the race — up to WARMUP_CEILING_MS of blocking warmup,
// then return 200 regardless; warmup keeps running in the
// background and subsequent health calls see warmed=true.

const WARMUP_CEILING_MS = 60_000;
const INTERNAL_FETCH_TIMEOUT_MS = 20_000;

let warmed = false;
let warming: Promise<void> | null = null;

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
  await Promise.race([
    warming,
    new Promise<void>((resolve) => setTimeout(resolve, WARMUP_CEILING_MS)),
  ]);
  return NextResponse.json({ status: "ok", warm: warmed });
}

async function runWarmup(): Promise<void> {
  const startedAt = Date.now();
  console.log("[health] warmup started");

  const { prisma } = await import("@/lib/prisma");
  const prismaStart = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  console.log(`[health] prisma ping ok (${Date.now() - prismaStart}ms)`);

  const port = process.env.PORT ?? "3000";
  const host = `http://127.0.0.1:${port}`;
  const fetchStart = Date.now();
  const results = await Promise.allSettled([
    timedFetch(`${host}/`),
    timedFetch(`${host}/sign-in`),
    timedFetch(`${host}/dashboard`),
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

async function timedFetch(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    INTERNAL_FETCH_TIMEOUT_MS,
  );
  try {
    return await fetch(url, {
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}
