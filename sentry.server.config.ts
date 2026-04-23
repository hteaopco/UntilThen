// Sentry server init — runs in the Node.js runtime (most API
// routes + server components). Loaded by instrumentation.ts.
import * as Sentry from "@sentry/nextjs";

// Railway env only has NEXT_PUBLIC_SENTRY_DSN; fall back to it
// so the server-side SDK actually has a target to send to.
const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (!dsn) {
  console.warn(
    "[sentry.server] no DSN configured (SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN missing). Events will be dropped.",
  );
} else {
  Sentry.init({
    dsn,

    tracesSampleRate: 0.1,

    // Skip the NODE_ENV gate: if a DSN is set we want to capture
    // events. Production runtime (Railway) reports events; local
    // dev skips init entirely by not setting the DSN.
    enabled: true,

    // Strip PII before transmission. We log a userId for context
    // (see Sentry.setUser elsewhere) but never an email or IP.
    beforeSend(event) {
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
    },
  });
}
