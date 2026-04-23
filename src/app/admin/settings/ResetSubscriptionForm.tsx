"use client";

import { AlertTriangle, Check, Loader2, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";

/**
 * Pre-launch testing helper: nuke a user's Subscription row +
 * cancel every linked Square sub so they can resubscribe on a
 * different cadence. Saved card stays on the Square customer so
 * the next subscribe flow doesn't prompt for card entry.
 *
 * Gated through /api/admin/reset-user-subscription which runs
 * the admin_auth cookie check.
 */
export function ResetSubscriptionForm() {
  const [email, setEmail] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<
    | null
    | { kind: "ok"; email: string; canceled: number; totalSubs: number; detail?: string }
    | { kind: "err"; message: string }
  >(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || busy) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/reset-user-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        email?: string;
        canceled?: number;
        totalSubs?: number;
        detail?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Reset failed.");
      }
      setResult({
        kind: "ok",
        email: data.email ?? email.trim(),
        canceled: data.canceled ?? 0,
        totalSubs: data.totalSubs ?? 0,
        detail: data.detail,
      });
      setConfirming(false);
    } catch (err) {
      setResult({ kind: "err", message: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 max-w-[520px]">
      <label className="block">
        <span className="block text-[11px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-1.5">
          User email
        </span>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setConfirming(false);
            setResult(null);
          }}
          placeholder="jett@example.com"
          className="account-input"
          autoComplete="off"
        />
      </label>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="submit"
          disabled={!email.trim() || busy}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-60 ${
            confirming
              ? "bg-red-600 text-white hover:bg-red-700"
              : "border-[1.5px] border-red-600 text-red-600 hover:bg-red-50"
          }`}
        >
          {busy ? (
            <Loader2
              size={14}
              strokeWidth={1.75}
              className="animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Trash2 size={14} strokeWidth={1.75} aria-hidden="true" />
          )}
          {busy
            ? "Resetting…"
            : confirming
              ? "Confirm reset"
              : "Reset subscription"}
        </button>
        {confirming && !busy && (
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-sm font-semibold text-ink-mid hover:text-navy px-2 py-2"
          >
            Cancel
          </button>
        )}
      </div>

      {confirming && !busy && (
        <p className="inline-flex items-start gap-1.5 text-[12px] text-amber-dark">
          <AlertTriangle
            size={13}
            strokeWidth={1.75}
            className="shrink-0 mt-0.5"
            aria-hidden="true"
          />
          This cancels every Square sub (base + pending + addons) and deletes
          the local Subscription row. Card on file stays.
        </p>
      )}

      {result?.kind === "ok" && (
        <p className="inline-flex items-center gap-1.5 text-[13px] text-sage">
          <Check size={14} strokeWidth={2} aria-hidden="true" />
          {result.detail ??
            `Cancelled ${result.canceled} of ${result.totalSubs} Square sub${result.totalSubs === 1 ? "" : "s"} for ${result.email}. User can now subscribe fresh.`}
        </p>
      )}

      {result?.kind === "err" && (
        <p className="text-[13px] text-red-600" role="alert">
          {result.message}
        </p>
      )}
    </form>
  );
}
