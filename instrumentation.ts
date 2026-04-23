// Next.js 15 instrumentation hook — wires Sentry into both the
// server and edge runtimes. Without this, the sentry.server/edge
// config files are never loaded.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Capture errors from React Server Components / Route Handlers
// — Next 15 surfaces them via this hook so they end up in Sentry
// instead of just the server logs.
export const onRequestError = Sentry.captureRequestError;
