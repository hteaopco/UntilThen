// Next.js 15 instrumentation hook. Runs ONCE per server process
// on startup. We dynamic-import the runtime-specific Sentry
// config files so the @sentry/nextjs webpack plugin can wrap
// them — inlining Sentry.init() here instead leaves the client
// un-bound from the request handler's scope and flush fails.
import * as Sentry from "@sentry/nextjs";

// Diagnostic flag readable from the admin sentry-test endpoint.
// Updated from register() so we can tell whether the hook ran,
// which branch it took, and what getClient() returned inside it.
export const registerStatus: {
  ran: boolean;
  runtime: string | null;
  clientBoundAfterImport: boolean;
  at: string | null;
  error: string | null;
} = {
  ran: false,
  runtime: null,
  clientBoundAfterImport: false,
  at: null,
  error: null,
};

export async function register() {
  registerStatus.ran = true;
  registerStatus.runtime = process.env.NEXT_RUNTIME ?? null;
  registerStatus.at = new Date().toISOString();
  console.log("[sentry-reg] register() called, runtime =", registerStatus.runtime);
  try {
    if (process.env.NEXT_RUNTIME === "nodejs") {
      await import("./sentry.server.config");
    } else if (process.env.NEXT_RUNTIME === "edge") {
      await import("./sentry.edge.config");
    }
    registerStatus.clientBoundAfterImport = Boolean(Sentry.getClient());
    console.log(
      "[sentry-reg] import done, client bound =",
      registerStatus.clientBoundAfterImport,
    );
  } catch (err) {
    registerStatus.error = (err as Error)?.message ?? String(err);
    console.error("[sentry-reg] import failed:", err);
  }
}

// Capture errors from React Server Components / Route Handlers —
// Next 15 surfaces them via this hook so they end up in Sentry
// instead of just the server logs.
export const onRequestError = Sentry.captureRequestError;
