"use client";

import { Heart } from "lucide-react";

/**
 * Phase 1 — Entry Screen.
 *
 * The sealed-moment-before-opening. Full-screen, no chrome, warm
 * bokeh background, recipient's name in Playfair, the reveal date
 * in DM Sans caps, and an amber pill Begin button.
 *
 * Tap Begin → caller advances to Phase 2 (Story Cards).
 *
 * The bokeh background is faked with layered radial gradients
 * for now; swap for a high-quality static asset
 * (`/reveal-bokeh.jpg` or similar) once design lands one — the
 * surrounding layout doesn't need to change.
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
  const dateLabel = formatRevealDate(revealDate);

  return (
    <main
      className="min-h-screen w-full flex flex-col items-center justify-center px-6 text-center"
      style={{
        background:
          // Three radial gradients stacked = warm bokeh-ish
          // texture without depending on an image asset. Tones
          // chosen to read as "cream + amber" so it matches the
          // brand without the visual noise of a stock photo.
          "radial-gradient(ellipse at 18% 22%, rgba(224, 154, 90, 0.18) 0%, transparent 38%), " +
          "radial-gradient(ellipse at 82% 78%, rgba(196, 122, 58, 0.22) 0%, transparent 42%), " +
          "radial-gradient(ellipse at 50% 50%, rgba(253, 243, 233, 1) 0%, rgba(253, 248, 242, 1) 100%)",
        paddingTop: "max(env(safe-area-inset-top), 24px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
      }}
    >
      <Heart
        size={20}
        strokeWidth={1.75}
        className="text-amber mb-7"
        aria-hidden="true"
      />

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

      <DecorativeRule />

      <p className="font-sans text-amber font-semibold text-[12px] tracking-[0.28em] uppercase">
        {dateLabel}
      </p>

      <button
        type="button"
        onClick={onBegin}
        className="mt-10 inline-flex items-center justify-center w-full max-w-[280px] rounded-full bg-amber px-8 py-4 text-white text-[15px] font-semibold tracking-[0.02em] hover:bg-amber-dark active:opacity-90 transition-colors"
        style={{ boxShadow: "0 8px 24px rgba(196,122,58,0.25)" }}
      >
        Begin
      </button>
    </main>
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
