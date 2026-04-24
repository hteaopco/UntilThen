// Sentry server init. The @sentry/nextjs webpack plugin treats
// this file as a special entrypoint and wraps it so the client
// binds to the scope that request handlers actually share — if
// we inline Sentry.init() inside instrumentation.ts's register()
// instead, getClient() returns undefined from handlers and events
// never flush.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    enabled: true,
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
  console.log(
    "[sentry] server init complete, client bound =",
    Boolean(Sentry.getClient()),
  );
} else {
  console.warn(
    "[sentry] no DSN — server Sentry disabled, events will be dropped.",
  );
}
