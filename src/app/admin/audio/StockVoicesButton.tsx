"use client";

import { useState } from "react";

type PerVoiceResult = {
  key: string;
  voiceId: string;
  bytes?: number;
  error?: string;
  durationMs?: number;
};

type Response = {
  success: boolean;
  results?: PerVoiceResult[];
  error?: string;
};

type Outcome =
  | { kind: "idle" }
  | { kind: "running" }
  | ({ kind: "done"; at: string } & Response);

function kb(n?: number): string {
  if (!n) return "?";
  return `${(n / 1024).toFixed(1)} KB`;
}

export function StockVoicesButton() {
  const [outcome, setOutcome] = useState<Outcome>({ kind: "idle" });

  async function fire() {
    setOutcome({ kind: "running" });
    try {
      const res = await fetch("/api/admin/generate-stock-voices", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as Response;
      setOutcome({
        kind: "done",
        at: new Date().toISOString(),
        success: Boolean(data.success),
        results: data.results,
        error: data.error,
      });
    } catch (err) {
      setOutcome({
        kind: "done",
        at: new Date().toISOString(),
        success: false,
        error: (err as Error).message ?? "Network error.",
      });
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={fire}
        disabled={outcome.kind === "running"}
        className="bg-navy text-white rounded-md px-4 py-2.5 text-[13px] font-bold hover:bg-navy/90 disabled:opacity-50"
      >
        {outcome.kind === "running"
          ? "Generating (may take 30–60s)…"
          : "Generate stock voices"}
      </button>

      {outcome.kind === "done" ? (
        <div
          className={`mt-3 rounded-md border px-3 py-2 text-[13px] ${
            outcome.success
              ? "border-sage/30 bg-sage-tint/50"
              : "border-red-200 bg-red-50"
          }`}
        >
          <p className={`font-bold ${outcome.success ? "text-navy" : "text-red-700"}`}>
            {outcome.success
              ? "Stock voices generated and uploaded."
              : "Generation failed."}
          </p>
          {outcome.error ? (
            <p className="text-[12px] mt-1 font-mono text-red-700 break-all">
              {outcome.error}
            </p>
          ) : null}
          {outcome.results ? (
            <ul className="text-ink-mid leading-[1.55] mt-1 text-[12px] font-mono">
              {outcome.results.map((r) => (
                <li key={r.key}>
                  <span className="text-navy">{r.key}</span>{" "}
                  {r.error ? (
                    <span className="text-red-700">— {r.error}</span>
                  ) : (
                    <span>
                      — {kb(r.bytes)} in {r.durationMs}ms (voice {r.voiceId})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
          <p className="text-[11px] text-ink-mid leading-[1.5] mt-2">
            Preview the result at{" "}
            <a
              href="/admin/previews"
              className="underline text-amber-dark font-semibold"
            >
              /admin/previews → Recipient Reveal — Mock Capsule
            </a>
            . The two VOICE contributions (Grandma Rose, Grandpa Bill)
            will play these clips instead of the old horse sample.
          </p>
        </div>
      ) : null}
    </div>
  );
}
