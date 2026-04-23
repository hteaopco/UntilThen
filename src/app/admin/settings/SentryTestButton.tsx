"use client";

import { useState } from "react";

type Outcome =
  | { kind: "idle" }
  | { kind: "firing" }
  | { kind: "fired"; eventId: string | null; at: string }
  | { kind: "error"; message: string };

export function SentryTestButton() {
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });

  async function fire() {
    setOutcome({ kind: "firing" });
    try {
      const res = await fetch("/api/admin/sentry-test", { method: "POST" });
      // The endpoint throws on purpose, so we expect a 500. The
      // body carries the eventId Sentry assigned so we can search
      // for it in the Sentry UI.
      const data = (await res.json().catch(() => ({}))) as {
        eventId?: string;
        error?: string;
      };
      if (res.status === 500 && data.eventId) {
        setOutcome({
          kind: "fired",
          eventId: data.eventId,
          at: new Date().toISOString(),
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
      <button
        type="button"
        onClick={fire}
        disabled={outcome.kind === "firing"}
        className="bg-navy text-white rounded-md px-4 py-2.5 text-[13px] font-bold hover:bg-navy/90 disabled:opacity-50"
      >
        {outcome.kind === "firing" ? "Firing…" : "Fire test error"}
      </button>
      {outcome.kind === "fired" ? (
        <div className="mt-3 rounded-md border border-sage/30 bg-sage-tint/50 px-3 py-2 text-[13px]">
          <p className="font-bold text-navy">Thrown.</p>
          <p className="text-ink-mid leading-[1.5]">
            Sentry event id:{" "}
            <code className="font-mono text-[12px]">
              {outcome.eventId ?? "(unknown)"}
            </code>
            . Should appear in your Sentry project within ~1 minute. Filter
            by tag <code className="font-mono text-[12px]">test:live</code>.
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
