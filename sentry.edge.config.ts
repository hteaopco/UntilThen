// Sentry edge init — runs in the Edge runtime (middleware +
// any route segment with `runtime = "edge"`). Loaded by
// instrumentation.ts.
import * as Sentry from "@sentry/nextjs";

// Same DSN-fallback as sentry.server.config.ts — Railway env
// only has NEXT_PUBLIC_SENTRY_DSN.
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
      return event;
    },
  });
}
