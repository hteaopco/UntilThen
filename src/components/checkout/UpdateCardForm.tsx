"use client";

import { Loader2, Lock } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { createSquareCardInput, type SquareCard } from "@/lib/square-sdk";

/**
 * Card-only checkout used by the billing page to replace the
 * payment method. Mounts the same Square hosted card iframe that
 * SubscriptionCheckout uses — tokenizes the new card and POSTs
 * the nonce to /api/payments/update-card, which handles the
 * atomic cross-subscription card swap on the server.
 */
export function UpdateCardForm({
  applicationId,
  locationId,
  onDone,
  onCancel,
}: {
  applicationId: string;
  locationId: string;
  onDone: (card: { brand: string | null; last4: string | null }) => void;
  onCancel?: () => void;
}) {
  const [cardReady, setCardReady] = useState(false);
  const [cardLoadError, setCardLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardRef = useRef<SquareCard | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const card = await createSquareCardInput(
          applicationId,
          locationId,
          "#update-card-container",
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
      const res = await fetch("/api/payments/update-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceId: tokenize.token }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't update your card.");
      }
      const body = (await res.json()) as {
        card?: { brand: string | null; last4: string | null };
      };
      onDone(body.card ?? { brand: null, last4: null });
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  const combinedError = error ?? cardLoadError;
  const canSubmit = cardReady && !submitting && !cardLoadError;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-1">
          Update payment method
        </p>
        <h2 className="text-[22px] font-extrabold text-navy tracking-[-0.3px]">
          Enter your new card
        </h2>
        <p className="mt-2 text-[13px] text-ink-mid leading-[1.55]">
          Your base plan and every add-on move to this card at the same
          time. Nothing charges right now — this just swaps the card on
          file.
        </p>
      </div>

      <div
        id="update-card-container"
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
          {submitting ? "Saving…" : "Save new card"}
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
        Secure payment via Square
      </p>
    </div>
  );
}
