// Sentry server init — runs in the Node.js runtime (most API
// routes + server components). Loaded by instrumentation.ts.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === "production",

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
