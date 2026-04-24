// Next.js 15 instrumentation hook. Runs ONCE per server process
// on startup. We dynamic-import the runtime-specific Sentry
// config files so the @sentry/nextjs webpack plugin can wrap
// them — inlining Sentry.init() here instead leaves the client
// un-bound from the request handler's scope and flush fails.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Capture errors from React Server Components / Route Handlers —
// Next 15 surfaces them via this hook so they end up in Sentry
// instead of just the server logs.
export const onRequestError = Sentry.captureRequestError;
