"use client";

import { AlertCircle, Check, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";

type Phase = {
  uid?: string;
  ordinal?: number;
  cadence?: string;
  pricing?: {
    type?: string;
    price_money?: { amount?: number; currency?: string };
  };
  order_template_id?: string;
};

type Row = {
  label: string;
  planId: string;
  configuredVariationId: string;
  variations: {
    id: string;
    name: string;
    cadence: string;
    phases: Phase[];
  }[];
  configuredMatches: boolean;
  error: string | null;
};

/**
 * Admin helper for resolving Square plan variation IDs.
 *
 * Click "Fetch from Square" → the server hits the Catalog retrieve
 * endpoint for each of our four configured plans and returns the
 * variation IDs. We display them side-by-side with the currently
 * configured SQUARE_PLAN_* env vars so the admin can spot and fix
 * mismatches (subscriptions.create needs variation IDs, not plan
 * IDs — the Dashboard UI only surfaces the latter).
 */
export function SquarePlanVariations() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchVariations() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/square-plan-variations", {
        cache: "no-store",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't fetch from Square.");
      }
      const body = (await res.json()) as { rows: Row[] };
      setRows(body.rows);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const allMatch = rows?.every((r) => r.configuredMatches) ?? false;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={fetchVariations}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-navy text-white text-sm font-bold hover:bg-navy/90 transition-colors disabled:opacity-60"
        >
          {loading ? (
            <Loader2
              size={14}
              strokeWidth={1.75}
              className="animate-spin"
              aria-hidden="true"
            />
          ) : (
            <RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" />
          )}
          {loading ? "Fetching…" : rows ? "Re-fetch from Square" : "Fetch from Square"}
        </button>
        {rows &&
          (allMatch ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sage">
              <Check size={14} strokeWidth={2} aria-hidden="true" />
              All four env vars match Square
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-600">
              <AlertCircle size={14} strokeWidth={1.75} aria-hidden="true" />
              One or more env vars need updating
            </span>
          ))}
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {rows && (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.label} row={row} />
          ))}
          {!allMatch && rows.some((r) => r.variations.length > 0) && (
            <div className="mt-4 rounded-xl border border-navy/10 bg-warm-surface/60 px-5 py-4">
              <p className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-2">
                Paste into Railway → Variables
              </p>
              <pre className="text-[12px] font-mono text-navy leading-[1.7] whitespace-pre-wrap break-all">
                {rows
                  .filter((r) => r.variations[0]?.id)
                  .map((r) => `SQUARE_PLAN_${r.label}=${r.variations[0]!.id}`)
                  .join("\n")}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Card({ row }: { row: Row }) {
  return (
    <div
      className={`rounded-xl border px-5 py-4 ${
        row.error
          ? "border-red-200 bg-red-50"
          : row.configuredMatches
            ? "border-sage/30 bg-sage-tint/40"
            : "border-amber/30 bg-amber-tint/30"
      }`}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <span className="text-[11px] uppercase tracking-[0.12em] font-bold text-navy">
          SQUARE_PLAN_{row.label}
        </span>
        {row.error ? (
          <span className="text-[10px] uppercase tracking-[0.08em] font-bold text-red-600 bg-white/70 px-2 py-0.5 rounded">
            Error
          </span>
        ) : row.configuredMatches ? (
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.08em] font-bold text-sage bg-white/70 px-2 py-0.5 rounded">
            <Check size={10} strokeWidth={2.5} aria-hidden="true" />
            Matches
          </span>
        ) : (
          <span className="text-[10px] uppercase tracking-[0.08em] font-bold text-amber bg-white/70 px-2 py-0.5 rounded">
            Mismatch
          </span>
        )}
      </div>

      <dl className="space-y-1.5 text-[12px]">
        <KV label="Plan ID" value={row.planId} />
        <KV
          label="Configured env"
          value={row.configuredVariationId || "(unset — falls back to plan id)"}
        />
      </dl>

      {row.error && (
        <p className="mt-2 text-sm text-red-700">{row.error}</p>
      )}

      {row.variations.length > 0 && (
        <div className="mt-3 space-y-3">
          <p className="text-[10px] uppercase tracking-[0.12em] font-bold text-ink-mid">
            Variations on this plan
          </p>
          {row.variations.map((v) => {
            const isConfigured = v.id === row.configuredVariationId;
            return (
              <div
                key={v.id}
                className={`rounded-lg border px-3 py-2 ${
                  isConfigured
                    ? "border-sage/40 bg-white/70"
                    : "border-navy/10 bg-white/40"
                }`}
              >
                <div
                  className={`flex items-center gap-2 text-[12px] ${
                    isConfigured ? "font-semibold text-navy" : "text-ink-mid"
                  }`}
                >
                  <code className="font-mono text-[11px] bg-white/60 px-1.5 py-0.5 rounded">
                    {v.id}
                  </code>
                  <span>
                    {v.name} · {v.cadence}
                  </span>
                  {isConfigured && (
                    <Check
                      size={12}
                      strokeWidth={2.5}
                      className="text-sage"
                      aria-hidden="true"
                    />
                  )}
                </div>
                {v.phases.length > 0 && (
                  <pre className="mt-2 text-[10px] font-mono text-ink-mid leading-[1.5] whitespace-pre-wrap break-all bg-navy/[0.02] border border-navy/5 rounded px-2 py-1.5">
                    {JSON.stringify(v.phases, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <dt className="text-[10px] uppercase tracking-[0.1em] font-bold text-ink-mid shrink-0">
        {label}
      </dt>
      <dd className="font-mono text-[11px] text-navy break-all">{value}</dd>
    </div>
  );
}
