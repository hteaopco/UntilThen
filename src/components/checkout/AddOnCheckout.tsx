"use client";

import { Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";

type Plan = "MONTHLY" | "ANNUAL";

type ProrationResponse = {
  amountTodayDollars: string;
  nextRenewalDate: string;
  nextRenewalAmountDollars: string;
};

/**
 * Add an extra capsule slot to an already-subscribed user.
 *
 * There's no card input — we reuse the card the user saved
 * during their original SubscriptionCheckout. The API
 * (/api/payments/addon-capsule) looks up the customer's card
 * on file and charges it for the prorated (monthly) or full
 * (annual) add-on amount.
 *
 * Called out of /dashboard or the onboarding "add a vault"
 * gate after we've determined the user is subscribed but at
 * their slot limit.
 */
export function AddOnCheckout({
  plan,
  usedSlots,
  onDone,
  onCancel,
}: {
  /** The subscriber's current plan cadence — drives whether we
   *  quote a prorated monthly add-on or the full annual price. */
  plan: Plan;
  usedSlots: number;
  onDone: (newSlotCount: number) => void;
  onCancel?: () => void;
}) {
  const [proration, setProration] = useState<ProrationResponse | null>(null);
  const [prorationLoading, setProrationLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setProrationLoading(true);
      try {
        const res = await fetch(
          `/api/payments/proration?plan=${plan}&type=addon`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error();
        const body = (await res.json()) as ProrationResponse;
        if (cancelled) return;
        setProration(body);
      } catch {
        if (cancelled) return;
        setProration(null);
      } finally {
        if (!cancelled) setProrationLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [plan]);

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/addon-capsule", {
        method: "POST",
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Couldn't add a slot.");
      }
      const body = (await res.json()) as { newSlotCount: number };
      onDone(body.newSlotCount);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  const isAnnual = plan === "ANNUAL";
  const perCycle = isAnnual ? "$6.00/yr" : "$0.99/mo";
  const todayCopy = proration?.amountTodayDollars ?? "…";
  const renewalDate = proration?.nextRenewalDate
    ? new Date(proration.nextRenewalDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "…";
  const renewalAmount = proration?.nextRenewalAmountDollars ?? "";

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-1">
          Add a capsule slot
        </p>
        <h2 className="text-[20px] font-extrabold text-navy tracking-[-0.3px]">
          You&rsquo;ve used all {usedSlots} capsule slots.
        </h2>
        <p className="mt-1 text-[13px] text-ink-mid">
          One more slot · {perCycle}
          {isAnnual ? " · free until your next renewal" : " (prorated this month)"}
        </p>
      </div>

      {isAnnual ? (
        <div className="rounded-xl border border-sage/30 bg-sage-tint/40 px-4 py-3 text-[13px] text-navy">
          <p className="font-semibold">Added free, no charge today.</p>
          <p className="mt-1 text-ink-mid text-[12px] leading-[1.55]">
            This slot is yours right now. We&rsquo;ll roll it into your
            annual renewal on{" "}
            <span className="font-semibold text-navy">{renewalDate}</span>
            {renewalAmount && (
              <>
                {" "}— your next bill will be{" "}
                <span className="font-semibold text-navy">
                  ${renewalAmount}
                </span>
              </>
            )}
            .
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-navy/[0.08] bg-warm-surface/60 px-4 py-3 space-y-1 text-[13px]">
          <div className="flex items-center justify-between">
            <span className="text-ink-mid">Charged today</span>
            <span className="font-bold text-navy tabular-nums">
              {prorationLoading ? "…" : `$${todayCopy}`}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-mid">Next renewal</span>
            <span className="text-ink-light tabular-nums">
              {renewalDate}
              {renewalAmount ? ` · +$${renewalAmount}` : ""}
            </span>
          </div>
        </div>
      )}

      <p className="text-[12px] text-ink-light">
        {isAnnual
          ? "Saved on the card you used for your subscription."
          : "Uses the card you saved with your subscription."}
      </p>

      {error && (
        <p className="text-[13px] text-red-600" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={submitting || prorationLoading}
          className="flex-1 inline-flex items-center justify-center gap-2 bg-amber text-white py-3 rounded-lg text-[14px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
        >
          {submitting ? (
            <>
              <Loader2
                size={14}
                strokeWidth={2}
                className="animate-spin"
                aria-hidden="true"
              />
              Adding…
            </>
          ) : (
            <>
              <Plus size={14} strokeWidth={2} aria-hidden="true" />
              Add capsule slot
            </>
          )}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="text-[13px] font-semibold text-ink-mid hover:text-navy px-3 py-3 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
