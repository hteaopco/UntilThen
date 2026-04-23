import { NextResponse, type NextRequest } from "next/server";

import { CRON_INTERVALS_SEC, cronRoute, type CronName } from "@/lib/cron-run";
import { sendCronHealthAlert } from "@/lib/emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Self-monitoring cron. Runs hourly. For each known cron name
 * (excluding itself — can't self-report its own staleness), it
 * finds the most recent CronRun, computes age, and alerts if
 * the cron has missed 2× its expected interval.
 *
 * De-duplication: an alert is only sent if we haven't sent one
 * for the same cron within the past 24 hours. The CronAlertState
 * singleton-per-cron row tracks lastAlertAt.
 *
 * Never blocks: an email send failure is logged but doesn't
 * propagate — we'd rather quietly skip the alert than wedge
 * the health check itself.
 */

const ALERT_DEDUP_MS = 24 * 60 * 60 * 1000;
const SUPPORT_EMAIL = "hello@untilthenapp.io";

interface StaleCron {
  name: CronName;
  intervalSec: number;
  staleThresholdSec: number;
  lastRunAt: Date | null;
  ageSec: number | null;
}

export const POST = cronRoute(
  "cron-health-check",
  async (): Promise<NextResponse> => {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Database not configured." },
        { status: 500 },
      );
    }

    const { prisma } = await import("@/lib/prisma");

    const cronNames = (Object.keys(CRON_INTERVALS_SEC) as CronName[]).filter(
      (n) => n !== "cron-health-check",
    );

    const stale: StaleCron[] = [];
    for (const name of cronNames) {
      const intervalSec = CRON_INTERVALS_SEC[name];
      const staleThresholdSec = intervalSec * 2;
      const lastRun = await prisma.cronRun.findFirst({
        where: { cronName: name },
        orderBy: { startedAt: "desc" },
        select: { startedAt: true },
      });
      const ageSec = lastRun
        ? Math.floor((Date.now() - lastRun.startedAt.getTime()) / 1000)
        : null;
      const isStale = ageSec === null ? false : ageSec > staleThresholdSec;
      // Also flag "has never run" only if the cron is one we
      // expect to have run by now — use 2× interval since the
      // service first started. Pragmatic: if we have ANY CronRun
      // rows at all and still none for this name, that's noisy;
      // just alert on "has run at least once and is now stale".
      if (isStale) {
        stale.push({
          name,
          intervalSec,
          staleThresholdSec,
          lastRunAt: lastRun?.startedAt ?? null,
          ageSec,
        });
      }
    }

    const alerted: string[] = [];
    const skipped: string[] = [];
    for (const cron of stale) {
      const lastAlert = await prisma.cronAlertState.findUnique({
        where: { cronName: cron.name },
      });
      if (
        lastAlert &&
        Date.now() - lastAlert.lastAlertAt.getTime() < ALERT_DEDUP_MS
      ) {
        skipped.push(cron.name);
        continue;
      }
      try {
        await sendCronHealthAlert({
          to: SUPPORT_EMAIL,
          cronName: cron.name,
          intervalSec: cron.intervalSec,
          staleThresholdSec: cron.staleThresholdSec,
          lastRunAt: cron.lastRunAt,
          ageSec: cron.ageSec,
        });
        await prisma.cronAlertState.upsert({
          where: { cronName: cron.name },
          create: { cronName: cron.name, lastAlertAt: new Date() },
          update: { lastAlertAt: new Date() },
        });
        alerted.push(cron.name);
      } catch (err) {
        console.error(
          `[cron-health-check] alert send failed for ${cron.name}:`,
          err,
        );
      }
    }

    return NextResponse.json({
      checked: cronNames.length,
      stale: stale.map((s) => s.name),
      alerted,
      skipped,
    });
  },
);
