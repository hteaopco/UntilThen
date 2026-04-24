// Next.js 15 instrumentation hook. MUST live at src/instrumentation.ts
// (not the project root) when the app uses the src/ layout — otherwise
// Next never invokes register() and Sentry's onRequestError handler
// never wires up.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
