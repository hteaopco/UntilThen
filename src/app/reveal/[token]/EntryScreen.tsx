"use client";

import { Heart } from "lucide-react";
import { useEffect } from "react";

import { useRevealAnalytics } from "./analytics";

/**
 * Phase 1 — Entry Screen.
 *
 * The sealed-moment-before-opening. Warm bokeh background, the
 * recipient's name in Playfair, a decorative rule, and the reveal
 * date. The Begin button slides up from the bottom a beat after
 * the rest of the content has faded in.
 *
 * Choreography (all CSS, no JS timers) — total ~2000ms:
 *   0ms    heart begins fade-in
 *   200ms  headline begins fade-in
 *   400ms  rule begins fade-in
 *   550ms  date begins fade-in
 *   1400ms Begin button starts its slide-up + fade
 *   2000ms Begin button fully visible — total opening lands
 *
 * Each element fades in over 900ms (the Begin button over 600ms),
 * so the slower pace feels contemplative rather than rushed.
 *
 * The reveal-experience background music is already playing by
 * the time we mount (the Gate phase satisfied the autoplay
 * gesture), so the fade-in reads as intro music → visuals
 * blooming in.
 */
export function EntryScreen({
  recipientName,
  revealDate,
  onBegin,
}: {
  recipientName: string;
  /** ISO date string. Rendered as "JUNE 24, 2032". */
  revealDate: string;
  onBegin: () => void;
}) {
  const { capture } = useRevealAnalytics();
  useEffect(() => {
    capture("reveal_entry_viewed");
  }, [capture]);

  const dateLabel = formatRevealDate(revealDate);

  return (
    <main
      className="min-h-screen w-full flex flex-col items-center justify-center px-6 text-center"
      style={{
        background:
          "radial-gradient(ellipse at 18% 22%, rgba(224, 154, 90, 0.18) 0%, transparent 38%), " +
          "radial-gradient(ellipse at 82% 78%, rgba(196, 122, 58, 0.22) 0%, transparent 42%), " +
          "radial-gradient(ellipse at 50% 50%, rgba(253, 243, 233, 1) 0%, rgba(253, 248, 242, 1) 100%)",
        paddingTop: "max(env(safe-area-inset-top), 24px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
      }}
    >
      <FadeIn delay={0}>
        <Heart
          size={20}
          strokeWidth={1.75}
          className="text-amber mb-7"
          aria-hidden="true"
        />
      </FadeIn>

      <FadeIn delay={200}>
        <h1
          className="font-serif text-navy leading-[1.12] tracking-[-0.4px] max-w-[18ch]"
          style={{ fontSize: "clamp(34px, 8.5vw, 44px)" }}
        >
          {recipientName ? `${recipientName},` : "This"}
          <br />
          this was made
          <br />
          for you.
        </h1>
      </FadeIn>

      <FadeIn delay={400}>
        <DecorativeRule />
      </FadeIn>

      <FadeIn delay={550}>
        <p className="font-sans text-amber font-semibold text-[12px] tracking-[0.28em] uppercase">
          {dateLabel}
        </p>
      </FadeIn>

      <button
        type="button"
        onClick={() => {
          capture("reveal_begin_clicked");
          onBegin();
        }}
        className="mt-10 inline-flex items-center justify-center w-full max-w-[280px] rounded-full bg-amber px-8 py-4 text-white text-[15px] font-semibold tracking-[0.02em] hover:bg-amber-dark active:opacity-90 transition-colors"
        style={{
          boxShadow: "0 8px 24px rgba(196,122,58,0.25)",
          animation:
            "entryBeginRise 600ms cubic-bezier(0.2, 0.7, 0.2, 1) 1400ms both",
        }}
      >
        Begin
      </button>

      <style jsx global>{`
        @keyframes entryFadeIn {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes entryBeginRise {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}

function FadeIn({
  delay,
  children,
}: {
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        animation: `entryFadeIn 900ms ease-out ${delay}ms both`,
      }}
    >
      {children}
    </div>
  );
}

function DecorativeRule() {
  return (
    <div
      className="my-7 flex items-center justify-center gap-3 text-amber"
      aria-hidden="true"
    >
      <span className="block h-px w-14 bg-amber/40" />
      <Heart size={11} strokeWidth={2} fill="currentColor" />
      <span className="block h-px w-14 bg-amber/40" />
    </div>
  );
}

function formatRevealDate(iso: string): string {
  try {
    return new Date(iso)
      .toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
      .toUpperCase();
  } catch {
    return "";
  }
}
