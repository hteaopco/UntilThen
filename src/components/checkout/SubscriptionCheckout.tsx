"use client";

import { Loader2, Lock, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  createSquareCardInput,
  type SquareCard,
} from "@/lib/square-sdk";

type Plan = "MONTHLY" | "ANNUAL";

type ProrationResponse = {
  amountTodayCents: number;
  amountTodayDollars: string;
  nextRenewalDate: string;
  nextRenewalAmountCents: number;
  nextRenewalAmountDollars: string;
};

/**
 * Starts the recurring Time Capsule subscription. Rendered
 * whenever a user hits a paywall gate that requires a
 * subscription (new vault, new gift capsule when gated).
 *
 * Flow:
 *   1. Fetch proration on mount so the CTA can show the real
 *      upfront charge for whichever plan is selected.
 *   2. Mount Square's hosted card iframe.
 *   3. On submit, tokenize → POST sourceId + plan to
 *      /api/payments/subscribe.
 *
 * Monthly plan shows a prorated charge today + renew-on-1st
 * copy. Annual shows full $35.99 today + renew-same-date-next-
 * year.
 */
export function SubscriptionCheckout({
  applicationId,
  locationId,
  onDone,
  onCancel,
}: {
  applicationId: string;
  locationId: string;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [plan, setPlan] = useState<Plan>("ANNUAL");
  const [proration, setProration] = useState<ProrationResponse | null>(null);
  const [prorationLoading, setProrationLoading] = useState(true);
  const [cardReady, setCardReady] = useState(false);
  const [cardLoadError, setCardLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardRef = useRef<SquareCard | null>(null);

  // Mount the card once on first render. The same card instance
  // serves both plan choices — plan only changes the server call.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const card = await createSquareCardInput(
          applicationId,
          locationId,
          "#subscription-card-container",
        );
        if (cancelled) {
          void card.destroy();
          return;
        }
        cardRef.current = card;
        setCardReady(true);
      } catch (err) {
        if (cancelled) return;
        setCardLoadError(
          err instanceof Error
            ? err.message
            : "We couldn't load the payment form. Please try again.",
        );
      }
    })();
    return () => {
      cancelled = true;
      const card = cardRef.current;
      cardRef.current = null;
      if (card) void card.destroy();
    };
  }, [applicationId, locationId]);

  // Refetch proration any time the plan toggle flips.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setProrationLoading(true);
      try {
        const res = await fetch(
          `/api/payments/proration?plan=${plan}&type=new`,
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
    if (!cardRef.current || !cardReady || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const tokenize = await cardRef.current.tokenize();
      if (tokenize.status !== "OK") {
        setError(
          tokenize.errors?.[0]?.message ??
            "Card details are invalid. Please check and try again.",
        );
        setSubmitting(false);
        return;
      }
      const res = await fetch("/api/payments/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, sourceId: tokenize.token }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Couldn't start your plan.");
      }
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  const chargeCopy = proration
    ? proration.amountTodayDollars
    : plan === "MONTHLY"
      ? "…"
      : "35.99";
  const renewalDate = proration?.nextRenewalDate
    ? new Date(proration.nextRenewalDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "…";
  const renewalAmount = proration?.nextRenewalAmountDollars ?? "";
  const combinedError = error ?? cardLoadError;
  const canSubmit = cardReady && !submitting && !cardLoadError;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-1">
          Time Capsule plan
        </p>
        <h2 className="text-[22px] font-extrabold text-navy tracking-[-0.3px]">
          Start your untilThen plan
        </h2>
      </div>

      {/* Plan toggle */}
      <div className="grid grid-cols-2 gap-2">
        <PlanOption
          active={plan === "MONTHLY"}
          onClick={() => setPlan("MONTHLY")}
          label="Monthly"
          price="$4.99/mo"
          caption="Prorated to the 1st"
        />
        <PlanOption
          active={plan === "ANNUAL"}
          onClick={() => setPlan("ANNUAL")}
          label="Annual"
          price="$35.99/yr"
          caption="Best value"
          badge
        />
      </div>

      <ul className="text-[13px] text-ink-mid leading-[1.7] space-y-1">
        <li>✓ Up to 3 Time Capsules included</li>
        <li>✓ Unlimited letters, photos, voice notes</li>
        <li>✓ Add more capsule slots any time</li>
      </ul>

      <div className="rounded-xl border border-navy/[0.08] bg-warm-surface/60 px-4 py-3 space-y-1 text-[13px]">
        <div className="flex items-center justify-between">
          <span className="text-ink-mid">Charged today</span>
          <span className="font-bold text-navy tabular-nums">
            {prorationLoading ? "…" : `$${chargeCopy}`}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink-mid">Renews</span>
          <span className="text-ink-light tabular-nums">
            {renewalDate}
            {renewalAmount ? ` · $${renewalAmount}` : ""}
          </span>
        </div>
      </div>

      <div
        id="subscription-card-container"
        className="rounded-xl border border-navy/15 bg-white px-3 py-3 min-h-[64px] flex items-center"
      >
        {!cardReady && !cardLoadError && (
          <span className="inline-flex items-center gap-2 text-[13px] text-ink-light">
            <Loader2
              size={14}
              strokeWidth={1.75}
              className="animate-spin"
              aria-hidden="true"
            />
            Loading secure card form…
          </span>
        )}
      </div>

      {combinedError && (
        <p className="text-[13px] text-red-600" role="alert">
          {combinedError}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="flex-1 bg-amber text-white py-3 rounded-lg text-[14px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
        >
          {submitting
            ? "Starting your plan…"
            : `Start plan — $${chargeCopy}`}
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

      <p className="text-[11px] text-ink-light inline-flex items-center gap-1.5">
        <Lock size={10} strokeWidth={2} aria-hidden="true" />
        Secure payment via Square · Cancel anytime
      </p>
    </div>
  );
}

function PlanOption({
  active,
  onClick,
  label,
  price,
  caption,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  price: string;
  caption: string;
  badge?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative text-left rounded-xl border px-4 py-3 transition-all ${
        active
          ? "border-amber bg-amber-tint/60 shadow-[0_2px_8px_rgba(196,122,58,0.1)]"
          : "border-navy/15 bg-white hover:border-navy/30"
      }`}
    >
      {badge && (
        <span className="absolute -top-2 right-3 inline-flex items-center gap-1 bg-amber text-white text-[9px] font-bold tracking-[0.12em] uppercase px-2 py-0.5 rounded-full">
          <Sparkles size={9} strokeWidth={2} aria-hidden="true" />
          Best value
        </span>
      )}
      <p className="text-[11px] uppercase tracking-[0.1em] font-bold text-ink-mid">
        {label}
      </p>
      <p className="mt-1 text-[16px] font-extrabold text-navy tracking-[-0.2px]">
        {price}
      </p>
      <p className="mt-0.5 text-[11px] text-ink-light">{caption}</p>
    </button>
  );
}
