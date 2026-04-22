"use client";

import { AlertCircle, Check, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

type Result = {
  label: string;
  orderId: string | null;
  error: string | null;
};

/**
 * One-click Square order template setup. Hits
 * /api/admin/square-setup-order-templates which creates four
 * DRAFT Orders in Square (one per subscription tier). We show
 * the resulting order IDs in a paste-ready block so the admin
 * can drop them into Railway as SQUARE_ORDER_TEMPLATE_* env vars.
 *
 * These templates are the missing piece for RELATIVE-priced plans
 * — subscriptions.create needs a phases[] entry referencing an
 * order_template_id that carries the real price.
 */
export function SquareOrderTemplateSetup() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/square-setup-order-templates", {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't create order templates.");
      }
      const body = (await res.json()) as { results: Result[] };
      setResults(body.results);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const allSucceeded = results?.every((r) => r.orderId) ?? false;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber text-white text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
        >
          {loading ? (
            <Loader2
              size={14}
              strokeWidth={1.75}
              className="animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
          )}
          {loading
            ? "Creating templates…"
            : results
              ? "Re-run setup"
              : "Create order templates"}
        </button>
        {results &&
          (allSucceeded ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sage">
              <Check size={14} strokeWidth={2} aria-hidden="true" />
              All four templates created
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600">
              <AlertCircle size={14} strokeWidth={1.75} aria-hidden="true" />
              One or more failed
            </span>
          ))}
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {results && (
        <div className="space-y-3">
          {results.map((r) => (
            <div
              key={r.label}
              className={`rounded-xl border px-5 py-4 ${
                r.error
                  ? "border-red-200 bg-red-50"
                  : "border-sage/30 bg-sage-tint/40"
              }`}
            >
              <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                <span className="text-[11px] uppercase tracking-[0.12em] font-bold text-navy">
                  SQUARE_ORDER_TEMPLATE_{r.label}
                </span>
                {r.error ? (
                  <span className="text-[10px] uppercase tracking-[0.08em] font-bold text-red-600 bg-white/70 px-2 py-0.5 rounded">
                    Error
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] font-bold text-sage bg-white/70 px-2 py-0.5 rounded">
                    <Check size={10} strokeWidth={2.5} aria-hidden="true" />
                    Created
                  </span>
                )}
              </div>
              {r.orderId && (
                <code className="font-mono text-[11px] text-navy break-all block">
                  {r.orderId}
                </code>
              )}
              {r.error && (
                <p className="text-sm text-red-700 mt-1">{r.error}</p>
              )}
            </div>
          ))}

          {allSucceeded && (
            <div className="rounded-xl border border-navy/10 bg-warm-surface/60 px-5 py-4">
              <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-2">
                Paste into Railway → Variables
              </p>
              <pre className="text-[12px] font-mono text-navy leading-[1.7] whitespace-pre-wrap break-all">
                {results
                  .filter((r) => r.orderId)
                  .map(
                    (r) => `SQUARE_ORDER_TEMPLATE_${r.label}=${r.orderId}`,
                  )
                  .join("\n")}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
