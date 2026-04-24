import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Readiness probe. Railway flips user traffic to this container the
// moment we return 200, so the handler blocks on a single DB ping to
// prove Next + Prisma can reach Postgres. We deliberately don't do
// any loopback warm-fetches here — they made the probe depend on
// full SSR renders completing, which tends to stall when the old
// container is still holding DB connections mid-deploy.
//
// If the ping succeeds we cache that and short-circuit future
// probes. If it fails we return 503 so Railway keeps the old
// container in rotation until the new one can actually serve.

let readyOnce = false;

export async function GET() {
  if (readyOnce) {
    return NextResponse.json({ status: "ok", warm: true });
  }
  const startedAt = Date.now();
  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.$queryRaw`SELECT 1`;
    readyOnce = true;
    console.log(`[health] ready in ${Date.now() - startedAt}ms`);
    return NextResponse.json({ status: "ok", warm: true });
  } catch (err) {
    console.error("[health] not ready:", err);
    return NextResponse.json(
      { status: "not-ready", error: (err as Error).message ?? "unknown" },
      { status: 503 },
    );
  }
}
