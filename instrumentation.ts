// Next.js 15 instrumentation hook — wires Sentry into both the
// server and edge runtimes. Without this, the sentry.server/edge
// config files are never loaded.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
    void primePrisma();
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Fire-and-forget Prisma pool prime so the first real DB-touching
// request doesn't pay the handshake cost. Deliberately does not
// block startup — the healthcheck returns 200 immediately and
// Railway flips traffic; this just warms the pool in parallel.
async function primePrisma() {
  try {
    const { prisma } = await import("@/lib/prisma");
    const startedAt = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    console.log(`[warmup] prisma pool primed in ${Date.now() - startedAt}ms`);
  } catch (err) {
    console.warn("[warmup] prisma ping failed:", err);
  }
}

// Capture errors from React Server Components / Route Handlers
// — Next 15 surfaces them via this hook so they end up in Sentry
// instead of just the server logs.
export const onRequestError = Sentry.captureRequestError;
