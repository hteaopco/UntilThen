// Sentry client init — runs in every browser tab. Loaded by
// instrumentation-client.ts via Next.js 15's instrumentation hook.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 10% transaction sampling for performance monitoring; bump to
  // 1.0 temporarily when chasing a slow path.
  tracesSampleRate: 0.1,

  // Session replay — 1% of all sessions, 100% of sessions that
  // hit an error so we always have a recording for the bad path.
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  // Don't ship dev errors to prod Sentry.
  enabled: process.env.NODE_ENV === "production",

  // Scrub sensitive data before transmission. Vault content,
  // entry bodies, media URLs, and contributor messages are all
  // off-limits — Sentry gets the shape of the error, not the
  // memories.
  beforeSend(event) {
    if (event.request?.data && typeof event.request.data === "object") {
      const data = event.request.data as Record<string, unknown>;
      if ("body" in data) data.body = "[REDACTED]";
      if ("mediaUrls" in data) data.mediaUrls = "[REDACTED]";
      if ("content" in data) data.content = "[REDACTED]";
      if ("title" in data) data.title = "[REDACTED]";
    }
    return event;
  },
});
