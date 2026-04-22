"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";

/**
 * Admin control for AppConfig.paywallEnabled.
 *
 * Clicking the track flips immediately + optimistically, PATCHes
 * /api/admin/config, and rolls back on error. No confirmation
 * dialog — the warning copy underneath is the backstop.
 *
 * Warning banner only renders when the paywall is OFF, because
 * that's the state that risks money being left on the table at
 * launch.
 */
export function PaywallToggle({
  initialEnabled,
}: {
  initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function flip() {
    if (busy) return;
    const next = !enabled;
    setEnabled(next);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paywallEnabled: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't save.");
      }
    } catch (err) {
      setEnabled(!next); // roll back
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <label className="inline-flex items-center gap-3 cursor-pointer select-none">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={flip}
          disabled={busy}
          className={`relative w-14 h-8 rounded-full transition-colors ${
            enabled ? "bg-amber" : "bg-navy/15"
          } disabled:opacity-60`}
        >
          <span
            aria-hidden="true"
            className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow-[0_2px_4px_rgba(15,31,61,0.2)] transition-transform ${
              enabled ? "translate-x-6" : "translate-x-0"
            }`}
          />
        </button>
        <span className="text-sm font-semibold text-navy">
          Payment required to create and activate capsules
        </span>
        {busy && (
          <Loader2
            size={14}
            strokeWidth={1.75}
            className="text-ink-light animate-spin ml-1"
            aria-hidden="true"
          />
        )}
      </label>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {!enabled && (
        <div
          role="alert"
          className="rounded-xl border border-amber/30 bg-amber-tint/50 px-4 py-3 flex items-start gap-2.5 max-w-[560px]"
        >
          <AlertTriangle
            size={16}
            strokeWidth={1.75}
            className="text-amber shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="text-[13px] text-navy/90 leading-[1.55]">
            <p className="font-bold text-navy">
              Paywall is currently DISABLED
            </p>
            <p className="mt-0.5">
              All capsules activate freely. Enable before soft launch.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
