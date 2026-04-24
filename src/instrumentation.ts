// Next.js 15 instrumentation hook. MUST live at src/instrumentation.ts
// (not the project root) when the app uses the src/ layout — otherwise
// Next never invokes register() and Sentry's onRequestError handler
// never wires up.
import * as Sentry from "@sentry/nextjs";

let lifecycleHooksInstalled = false;

/**
 * Log why the Node process is terminating. Railway showed deploys
 * where the container died silently — by the time we looked at
 * logs there was no trace of what killed it. These hooks write a
 * single line for every exit path (signals, uncaught exceptions,
 * unhandled rejections, normal exit) so the next silent death
 * leaves something in the Deploy Logs.
 */
function installLifecycleHooks() {
  if (lifecycleHooksInstalled) return;
  lifecycleHooksInstalled = true;
  const bootAt = Date.now();

  process.on("uncaughtException", (err) => {
    console.error("[process] uncaughtException:", err);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("[process] unhandledRejection:", reason);
  });
  for (const sig of ["SIGTERM", "SIGINT", "SIGHUP"] as const) {
    process.on(sig, () => {
      const uptimeSec = Math.round((Date.now() - bootAt) / 1000);
      console.log(`[process] ${sig} received after ${uptimeSec}s uptime`);
    });
  }
  process.on("exit", (code) => {
    const uptimeSec = Math.round((Date.now() - bootAt) / 1000);
    console.log(
      `[process] exit code=${code} after ${uptimeSec}s uptime ` +
        `(rss=${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB)`,
    );
  });

  console.log(
    `[process] lifecycle hooks installed (pid=${process.pid}, ` +
      `runtime=${process.env.NEXT_RUNTIME ?? "unknown"})`,
  );
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    installLifecycleHooks();
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
