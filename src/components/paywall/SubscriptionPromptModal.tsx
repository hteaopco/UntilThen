"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

import { SubscriptionCheckout } from "@/components/checkout/SubscriptionCheckout";

/**
 * Drops `SubscriptionCheckout` into a centred modal. Used by the
 * three content-gate surfaces (CapsuleHero +, CollectionCard +,
 * CollectionLandingView +) to let a user subscribe in place
 * instead of bouncing them to /account/billing. On success, the
 * caller's `onSubscribed` fires — typically that routes onward to
 * the editor the user was trying to reach.
 *
 * The modal mounts the SAME checkout component used on the
 * billing page and inside AddChildModal, so the subscription
 * experience is identical everywhere.
 */
export function SubscriptionPromptModal({
  squareApplicationId,
  squareLocationId,
  onSubscribed,
  onClose,
}: {
  squareApplicationId: string;
  squareLocationId: string;
  onSubscribed: () => void;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Esc to close + background scroll lock while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label="Start your untilThen plan"
      className="fixed inset-0 z-50 bg-navy/50 backdrop-blur-sm flex items-start sm:items-center justify-center px-4 py-8 overflow-y-auto"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="relative w-full max-w-[520px] bg-cream rounded-2xl shadow-xl px-6 py-7 sm:px-8 sm:py-8">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-ink-mid hover:text-navy transition-colors flex items-center justify-center"
        >
          <X size={16} strokeWidth={1.75} aria-hidden="true" />
        </button>

        <div className="mb-5">
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-1">
            Subscribe to continue
          </p>
          <p className="text-[14px] text-ink-mid leading-[1.6]">
            Your capsule is ready — start your plan to add memories and save
            what you&rsquo;ve written.
          </p>
        </div>

        <SubscriptionCheckout
          applicationId={squareApplicationId}
          locationId={squareLocationId}
          onDone={onSubscribed}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
