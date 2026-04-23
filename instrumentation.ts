// Next.js 15 instrumentation hook. Runs ONCE per server process
// on startup. Initializes Sentry for both the Node.js and Edge
// runtimes directly here (not via a dynamic import of a separate
// config file) — that module-boundary split was preventing
// Sentry.getClient() from returning a bound client inside
// request handlers, even when Sentry.init() had run.
import * as Sentry from "@sentry/nextjs";

// Sentry v10 narrowed beforeSend to ErrorEvent specifically, so
// importing the exact type keeps the signature happy.
function commonBeforeSend(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  // Strip PII. Stay conservative — Sentry should get the shape
  // of an error, not the contents of a memory.
  if (event.user) {
    delete event.user.email;
    delete event.user.ip_address;
  }
  if (event.request?.data && typeof event.request.data === "object") {
    const data = event.request.data as Record<string, unknown>;
    if ("body" in data) data.body = "[REDACTED]";
    if ("mediaUrls" in data) data.mediaUrls = "[REDACTED]";
    if ("content" in data) data.content = "[REDACTED]";
    if ("title" in data) data.title = "[REDACTED]";
    if ("password" in data) data.password = "[REDACTED]";
  }
  return event;
}

export async function register() {
  const dsn =
    process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || "";

  if (!dsn) {
    console.warn(
      "[sentry] no DSN (SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN) — skipping init. Events will be dropped.",
    );
    return;
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      enabled: true,
      beforeSend: commonBeforeSend,
    });
    console.log(
      "[sentry] node init complete, client bound =",
      Boolean(Sentry.getClient()),
    );
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn,
      tracesSampleRate: 0.1,
      enabled: true,
      beforeSend: commonBeforeSend,
    });
    console.log(
      "[sentry] edge init complete, client bound =",
      Boolean(Sentry.getClient()),
    );
  }
}

// Capture errors from React Server Components / Route Handlers
// — Next 15 surfaces them via this hook so they end up in Sentry
// instead of just the server logs.
export const onRequestError = Sentry.captureRequestError;
