"use client";

import { Loader2, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  createSquareCardInput,
  type SquareCard,
} from "@/lib/square-sdk";

/**
 * Card-entry step for the one-time $9.99 Gift Capsule charge.
 *
 * Mounts Square's hosted card-entry iframe into a DOM node we
 * own, tokenizes the card on submit, and calls onTokenized with
 * the resulting nonce. The parent (ActivationModal) then sends
 * that nonce to /activate which actually charges the card.
 *
 * No money moves until the server side. If tokenization fails
 * (declined card from the upfront AVS/CVV check, invalid data,
 * SDK load error, etc.) we surface a friendly message inline.
 */
export function GiftCapsuleCheckout({
  capsuleTitle,
  applicationId,
  locationId,
  onTokenized,
  onCancel,
  isBusy,
  serverError,
}: {
  capsuleTitle: string;
  applicationId: string;
  locationId: string;
  /** Called once card details successfully tokenize. The parent
   *  takes the nonce from here and POSTs to /activate. */
  onTokenized: (sourceId: string) => Promise<void> | void;
  onCancel: () => void;
  /** When the parent is mid-server-call we lock the button to
   *  prevent double-submission. */
  isBusy: boolean;
  /** Server-side error surfaced from /activate (card declined,
   *  insufficient funds, etc.). Re-rendered inside the card
   *  container so the user sees it alongside the input. */
  serverError: string | null;
}) {
  const cardRef = useRef<SquareCard | null>(null);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tokenizing, setTokenizing] = useState(false);
  const [tokenizeError, setTokenizeError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const card = await createSquareCardInput(
          applicationId,
          locationId,
          "#gift-capsule-card-container",
        );
        if (cancelled) {
          void card.destroy();
          return;
        }
        cardRef.current = card;
        setReady(true);
      } catch (err) {
        if (cancelled) return;
        setLoadError(
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
      if (card) {
        void card.destroy();
      }
    };
  }, [applicationId, locationId]);

  async function submit() {
    if (!cardRef.current || !ready || tokenizing || isBusy) return;
    setTokenizing(true);
    setTokenizeError(null);
    try {
      const result = await cardRef.current.tokenize();
      if (result.status === "OK") {
        await onTokenized(result.token);
      } else {
        const firstError = result.errors?.[0]?.message;
        setTokenizeError(
          firstError ??
            "Card details are invalid. Please check and try again.",
        );
      }
    } catch (err) {
      setTokenizeError(
        err instanceof Error
          ? err.message
          : "We couldn't process that card. Please try again.",
      );
    } finally {
      setTokenizing(false);
    }
  }

  const combinedError = serverError ?? tokenizeError ?? loadError;
  const canSubmit = ready && !tokenizing && !isBusy && !loadError;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-1">
          Complete your Gift Capsule
        </p>
        <h2 className="text-[18px] font-extrabold text-navy tracking-[-0.3px] truncate">
          {capsuleTitle}
        </h2>
        <p className="text-[13px] text-ink-mid mt-0.5">One-time · $9.99</p>
      </div>

      <div
        id="gift-capsule-card-container"
        className="rounded-xl border border-navy/15 bg-white px-3 py-3 min-h-[64px] flex items-center"
      >
        {!ready && !loadError && (
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

      <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="flex-1 bg-amber text-white py-3 rounded-lg text-[14px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
        >
          {tokenizing || isBusy ? "Processing…" : "Pay $9.99"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={tokenizing || isBusy}
          className="text-[13px] font-semibold text-ink-mid hover:text-navy px-3 py-3 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

      <p className="text-[11px] text-ink-light inline-flex items-center gap-1.5">
        <Lock size={10} strokeWidth={2} aria-hidden="true" />
        Secure payment via Square
      </p>
    </div>
  );
}
