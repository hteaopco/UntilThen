"use client";

import { ArrowRight, Bookmark, Sparkles, X } from "lucide-react";
import { useEffect } from "react";

import { useRevealAnalytics } from "./analytics";

/**
 * Save-prompt overlay shown on top of the gallery once the
 * recipient lands on 'everything'. Smaller, centered card with a
 * blurred backdrop instead of a full-screen takeover so the
 * recipient can see the gallery underneath and the prompt feels
 * like an offer, not a wall.
 *
 * Three ways to dismiss:
 *   1. X icon in the top-right
 *   2. 'Skip to everything' text link
 *   3. Click outside the card (backdrop)
 *   4. Press Escape
 *
 * All four route through onSkip — the gallery remains, and the
 * persistent save banner along the gallery header stays as the
 * always-on fallback.
 */
export function SavePromptScreen({
  recipientName,
  onSave,
  onSkip,
}: {
  recipientName: string;
  onSave: () => void;
  onSkip: () => void;
}) {
  const { capture } = useRevealAnalytics();
  useEffect(() => {
    capture("reveal_save_prompt_viewed");
  }, [capture]);

  // Escape key dismisses (parity with the X button + backdrop).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  const firstName = recipientName.split(" ")[0] ?? recipientName;

  return (
    <div
      // z-[260] so the modal stacks above any preview top bar
      // (z-[250]). Click on the backdrop dismisses, mirroring the
      // X button.
      className="fixed inset-0 z-[260] flex items-center justify-center p-4 bg-warm-slate/40 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-prompt-heading"
      onClick={onSkip}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-cream rounded-3xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.45)] w-full max-w-[380px] px-7 py-8 text-center"
        style={{
          background:
            "radial-gradient(ellipse at 18% 22%, rgba(224, 154, 90, 0.18) 0%, transparent 38%), " +
            "radial-gradient(ellipse at 82% 78%, rgba(196, 122, 58, 0.22) 0%, transparent 42%), " +
            "radial-gradient(ellipse at 50% 50%, rgba(253, 243, 233, 1) 0%, rgba(253, 248, 242, 1) 100%)",
        }}
      >
        <button
          type="button"
          onClick={onSkip}
          aria-label="Close"
          className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-mid hover:text-navy hover:bg-navy/[0.06] transition-colors"
        >
          <X size={16} strokeWidth={2} aria-hidden="true" />
        </button>

        <Sparkles
          size={22}
          strokeWidth={1.5}
          className="text-amber mx-auto mb-4"
          aria-hidden="true"
        />

        <h2
          id="save-prompt-heading"
          className="font-serif text-navy text-[22px] leading-[1.25] tracking-[-0.3px]"
        >
          Replay anytime, save to your account.
        </h2>

        <p className="mt-3 text-[14px] leading-[1.55] text-ink-mid">
          Sign in or sign up so {firstName ? `${firstName}'s` : "this"} capsule
          stays here for you &mdash; no magic link required to come back.
        </p>

        <button
          type="button"
          onClick={() => {
            capture("reveal_save_prompt_save");
            onSave();
          }}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-full bg-amber text-white text-[14px] font-bold tracking-[0.01em] hover:bg-amber-dark active:opacity-90 transition-colors"
          style={{ height: "48px" }}
        >
          <Bookmark size={16} strokeWidth={2} aria-hidden="true" />
          Save to your account
        </button>

        <button
          type="button"
          onClick={() => {
            capture("reveal_save_prompt_skip");
            onSkip();
          }}
          className="mt-3 inline-flex items-center gap-1.5 text-amber text-[13px] font-semibold hover:text-amber-dark transition-colors"
        >
          Skip to everything
          <ArrowRight size={13} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
