// Cron health tracking.
//
// Every cron's handler runs its real work inside `withCronRun()`,
// which writes a RUNNING row to CronRun, then updates it to OK
// (with duration) or ERROR (with message) on completion. The
// admin dashboard + the /api/cron/cron-health-check alerting
// cron both read from this table.
//
// Routes should use the `cronRoute()` wrapper below so the
// bearer-token auth check, cron tracking, and error response
// shape stay consistent across every cron endpoint.
//
// Expected intervals are declared here so the health check knows
// what "stale" means for each cron. Keep in sync with the cron
// services configured in Railway.

import { NextResponse, type NextRequest } from "next/server";

export type CronName =
  | "reveal"
  | "moderation-cleanup"
  | "reminders"
  | "capsule-contributor-reminder"
  | "capsule-draft-expiry"
  | "countdowns"
  | "db-backup"
  | "prune-audit-log"
  | "cron-health-check";

/**
 * Expected interval between runs, in seconds. The health
 * checker alerts when a cron hasn't run in >2× its interval.
 * Per product spec:
 *   reveal           → alert at 30 min  (interval 15 min)
 *   moderation       → alert at 30 min  (interval 15 min)
 *   reminders        → alert at 2 weeks (interval 1 week)
 *   daily crons      → alert at 48 h    (interval 24 h)
 */
export const CRON_INTERVALS_SEC: Record<CronName, number> = {
  reveal: 15 * 60,
  "moderation-cleanup": 15 * 60,
  reminders: 7 * 24 * 60 * 60,
  "capsule-contributor-reminder": 24 * 60 * 60,
  "capsule-draft-expiry": 24 * 60 * 60,
  countdowns: 24 * 60 * 60,
  "db-backup": 24 * 60 * 60,
  "prune-audit-log": 24 * 60 * 60,
  // The health checker itself runs hourly. We don't bother
  // self-monitoring with an alert (if it's down, it can't alert).
  "cron-health-check": 60 * 60,
};

/**
 * Run `fn` and record the outcome in CronRun. Returns whatever
 * `fn` returns. If `fn` throws, the error is written to the run
 * row and then re-thrown so the route can return a 500.
 *
 * If the CronRun.create itself fails (DB hiccup), we log and
 * still run `fn` — losing observability is preferable to
 * skipping the cron's real work.
 */
/**
 * Wrap an async cron handler so the bearer-token auth check +
 * the withCronRun() observability wrap happen uniformly. Usage:
 *
 *   export const POST = cronRoute("reveal", async (req) => {
 *     // actual work, returns NextResponse
 *   });
 *
 * Handler errors are written to CronRun (via withCronRun) AND
 * re-thrown so Next.js returns 500, which Railway interprets as
 * a cron failure for retry scheduling.
 */
export function cronRoute(
  name: CronName,
  handler: (req: NextRequest) => Promise<NextResponse>,
): (req: NextRequest) => Promise<NextResponse> {
  return async (req: NextRequest): Promise<NextResponse> => {
    const secret = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return withCronRun(name, () => handler(req));
  };
}

export async function withCronRun<T>(
  name: CronName,
  fn: () => Promise<T>,
): Promise<T> {
  if (!process.env.DATABASE_URL) return fn();

  const { prisma } = await import("@/lib/prisma");
  let runId: string | null = null;
  try {
    const run = await prisma.cronRun.create({
      data: { cronName: name, status: "RUNNING" },
      select: { id: true },
    });
    runId = run.id;
  } catch (err) {
    console.error(`[cron-run] couldn't create run for ${name}:`, err);
  }

  const startedAt = Date.now();
  try {
    const result = await fn();
    if (runId) {
      await prisma.cronRun
        .update({
          where: { id: runId },
          data: {
            status: "OK",
            finishedAt: new Date(),
            durationMs: Date.now() - startedAt,
          },
        })
        .catch((err) =>
          console.error(`[cron-run] couldn't mark OK for ${name}:`, err),
        );
    }
    return result;
  } catch (err) {
    if (runId) {
      await prisma.cronRun
        .update({
          where: { id: runId },
          data: {
            status: "ERROR",
            finishedAt: new Date(),
            durationMs: Date.now() - startedAt,
            errorMessage:
              (err as Error)?.message?.slice(0, 2000) ?? String(err).slice(0, 2000),
          },
        })
        .catch((updateErr) =>
          console.error(
            `[cron-run] couldn't mark ERROR for ${name}:`,
            updateErr,
          ),
        );
    }
    throw err;
  }
}
