"use client";

import { useEffect, useState } from "react";

interface SentryStatus {
  hasDsn: boolean;
  dsnSource: "SENTRY_DSN" | "NEXT_PUBLIC_SENTRY_DSN" | null;
  dsnHost: string | null;
}

type Outcome =
  | { kind: "idle" }
  | { kind: "firing" }
  | {
      kind: "fired";
      eventId: string | null;
      at: string;
      sentry: SentryStatus & { flushed?: boolean; flushError?: string | null };
    }
  | { kind: "error"; message: string };

export function SentryTestButton() {
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });
  const [status, setStatus] = useState<SentryStatus | null>(null);

  // Pull init state on mount so we can show DSN source/host
  // before the admin even clicks the button. We deliberately
  // DON'T check Sentry.getClient() here — in @sentry/nextjs v10
  // that returns undefined across async scope boundaries even
  // when capture works fine, so the old "clientActive" field
  // lied. The real signal is whether captureException returns
  // a non-null event id after firing.
  useEffect(() => {
    fetch("/api/admin/sentry-test")
      .then((r) => r.json())
      .then((data: SentryStatus) => setStatus(data))
      .catch(() => setStatus(null));
  }, []);

  async function fire() {
    setOutcome({ kind: "firing" });
    try {
      const res = await fetch("/api/admin/sentry-test", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        eventId?: string;
        error?: string;
        sentry?: SentryStatus & {
          flushed?: boolean;
          flushError?: string | null;
        };
      };
      if (res.status === 500 && data.sentry) {
        setOutcome({
          kind: "fired",
          eventId: data.eventId ?? null,
          at: new Date().toISOString(),
          sentry: data.sentry,
        });
      } else {
        setOutcome({
          kind: "error",
          message:
            data.error ??
            `Unexpected status ${res.status}. Check that Sentry is configured and try again.`,
        });
      }
    } catch (err) {
      setOutcome({
        kind: "error",
        message: (err as Error).message ?? "Network error.",
      });
    }
  }

  return (
    <div>
      {status ? (
        <div className="mb-3 rounded-md border border-navy/10 bg-warm-surface/30 px-3 py-2 text-[12px] font-mono leading-[1.6]">
          <div>
            <span className="text-ink-mid">DSN present:</span>{" "}
            <span
              className={
                status.hasDsn
                  ? "text-sage font-bold"
                  : "text-red-600 font-bold"
              }
            >
              {status.hasDsn ? "YES" : "NO"}
            </span>{" "}
            <span className="text-ink-light">
              ({status.dsnSource ?? "none"})
            </span>
          </div>
          {status.dsnHost ? (
            <div>
              <span className="text-ink-mid">Host:</span>{" "}
              <span className="text-navy">{status.dsnHost}</span>
            </div>
          ) : null}
          {!status.hasDsn ? (
            <p className="text-[11px] text-red-600 mt-1">
              No Sentry DSN in the server env. Add{" "}
              <code>NEXT_PUBLIC_SENTRY_DSN</code> or <code>SENTRY_DSN</code>{" "}
              in Railway and redeploy.
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={fire}
        disabled={outcome.kind === "firing" || !status?.hasDsn}
        className="bg-navy text-white rounded-md px-4 py-2.5 text-[13px] font-bold hover:bg-navy/90 disabled:opacity-50"
      >
        {outcome.kind === "firing" ? "Firing…" : "Fire test error"}
      </button>

      {outcome.kind === "fired" ? (
        <div
          className={`mt-3 rounded-md border px-3 py-2 text-[13px] ${
            outcome.eventId && outcome.sentry.flushed
              ? "border-sage/30 bg-sage-tint/50"
              : "border-amber/40 bg-amber-tint/40"
          }`}
        >
          <p className="font-bold text-navy">
            {outcome.eventId && outcome.sentry.flushed
              ? "Fired and flushed."
              : "Fired — but something was off, check below."}
          </p>
          <ul className="text-ink-mid leading-[1.55] mt-1 text-[12px] font-mono">
            <li>
              Event id:{" "}
              <span className="text-navy">
                {outcome.eventId ??
                  "(none returned — SDK didn't accept the exception)"}
              </span>
            </li>
            <li>
              Flushed:{" "}
              <span className="text-navy">
                {outcome.sentry.flushed === undefined
                  ? "?"
                  : outcome.sentry.flushed
                    ? "yes"
                    : "no (timeout or transport error)"}
              </span>
            </li>
            {outcome.sentry.flushError ? (
              <li className="text-red-600">
                Flush error: {outcome.sentry.flushError}
              </li>
            ) : null}
          </ul>
          <p className="text-[11px] text-ink-mid leading-[1.5] mt-2">
            Confirm in Sentry → Issues → filter by tag{" "}
            <code className="font-mono">test:live</code>. A real event id
            + flushed=yes means capture is working end-to-end.
          </p>
        </div>
      ) : null}
      {outcome.kind === "error" ? (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {outcome.message}
        </div>
      ) : null}
    </div>
  );
}
