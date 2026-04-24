"use client";

import { useEffect, useState } from "react";

interface SentryStatus {
  hasDsn: boolean;
  dsnSource: "SENTRY_DSN" | "NEXT_PUBLIC_SENTRY_DSN" | null;
  dsnHost: string | null;
}

interface FiredPayload {
  eventIds: { A: string | null; B: string | null; C: string | null };
  sentry: SentryStatus & {
    flushed?: boolean;
    clientFlushed?: boolean | null;
    flushError?: string | null;
    clients?: {
      direct: boolean;
      currentScope: boolean;
      isolationScope: boolean;
    };
    register?: {
      ran: boolean;
      runtime: string | null;
      clientBoundAfterImport: boolean;
      at: string | null;
      error: string | null;
    };
  };
}

type Outcome =
  | { kind: "idle" }
  | { kind: "firing" }
  | ({ kind: "fired"; at: string } & FiredPayload)
  | { kind: "error"; message: string };

export function SentryTestButton() {
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });
  const [status, setStatus] = useState<SentryStatus | null>(null);

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
      const data = (await res.json().catch(() => ({}))) as Partial<FiredPayload> & {
        error?: string;
      };
      if (res.status === 500 && data.sentry && data.eventIds) {
        setOutcome({
          kind: "fired",
          at: new Date().toISOString(),
          eventIds: data.eventIds,
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

  const anyEventId =
    outcome.kind === "fired"
      ? outcome.eventIds.A ?? outcome.eventIds.B ?? outcome.eventIds.C
      : null;
  const flushedSomehow =
    outcome.kind === "fired"
      ? Boolean(outcome.sentry.flushed) || Boolean(outcome.sentry.clientFlushed)
      : false;

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
            anyEventId && flushedSomehow
              ? "border-sage/30 bg-sage-tint/50"
              : "border-amber/40 bg-amber-tint/40"
          }`}
        >
          <p className="font-bold text-navy">
            {anyEventId && flushedSomehow
              ? "Fired and flushed."
              : "Fired — check the event ids in Sentry to see which path landed."}
          </p>
          <ul className="text-ink-mid leading-[1.55] mt-1 text-[12px] font-mono">
            <li>
              Path A (plain):{" "}
              <span className="text-navy">
                {outcome.eventIds.A ?? "(none)"}
              </span>
            </li>
            <li>
              Path B (withScope):{" "}
              <span className="text-navy">
                {outcome.eventIds.B ?? "(none)"}
              </span>
            </li>
            <li>
              Path C (client.captureException):{" "}
              <span className="text-navy">
                {outcome.eventIds.C ?? "(none)"}
              </span>
            </li>
            {outcome.sentry.clients ? (
              <li className="text-ink-light">
                Clients: direct={String(outcome.sentry.clients.direct)},{" "}
                currentScope={String(outcome.sentry.clients.currentScope)},{" "}
                isolationScope={String(outcome.sentry.clients.isolationScope)}
              </li>
            ) : null}
            {outcome.sentry.register ? (
              <li className="text-ink-light">
                register(): ran={String(outcome.sentry.register.ran)},{" "}
                runtime={outcome.sentry.register.runtime ?? "null"},{" "}
                clientAfterImport=
                {String(outcome.sentry.register.clientBoundAfterImport)}
                {outcome.sentry.register.error
                  ? ` · error: ${outcome.sentry.register.error}`
                  : ""}
              </li>
            ) : null}
            <li>
              Sentry.flush:{" "}
              <span className="text-navy">
                {outcome.sentry.flushed === undefined
                  ? "?"
                  : outcome.sentry.flushed
                    ? "yes"
                    : "no"}
              </span>
              {" · "}
              client.flush:{" "}
              <span className="text-navy">
                {outcome.sentry.clientFlushed === undefined ||
                outcome.sentry.clientFlushed === null
                  ? "n/a"
                  : outcome.sentry.clientFlushed
                    ? "yes"
                    : "no"}
              </span>
            </li>
            {outcome.sentry.flushError ? (
              <li className="text-red-600">
                Flush error: {outcome.sentry.flushError}
              </li>
            ) : null}
          </ul>
          <p className="text-[11px] text-ink-mid leading-[1.5] mt-2">
            In Sentry → Issues → filter by tag{" "}
            <code className="font-mono">test:live</code>. Whichever of
            A/B/C appears is the capture path we standardise on.
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
