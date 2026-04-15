// Sentry edge init — runs in the Edge runtime (middleware +
// any route segment with `runtime = "edge"`). Loaded by
// instrumentation.ts.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  tracesSampleRate: 0.1,
  enabled: process.env.NODE_ENV === "production",

  beforeSend(event) {
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  },
});
