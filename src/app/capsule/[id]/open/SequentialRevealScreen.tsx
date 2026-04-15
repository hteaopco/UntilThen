"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";

type Contribution = {
  id: string;
  authorName: string;
  type: "TEXT" | "PHOTO" | "VOICE" | "VIDEO";
  title: string | null;
  body: string | null;
};

/**
 * First-open guided reveal. One contribution per screen. Back
 * is only allowed to already-viewed slides (per v1.1 clarification
 * #2) — no skipping forward. After the last slide, onComplete
 * hands off to the browseable list.
 */
export function SequentialRevealScreen({
  contributions,
  onComplete,
}: {
  contributions: Contribution[];
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  // Track the furthest index the user has reached so Back only
  // allows jumping to slides they've already seen.
  const [maxSeen, setMaxSeen] = useState(0);

  const total = contributions.length;
  const current = contributions[index];
  if (!current) {
    // Empty safeguard — the client should have skipped the
    // sequence entirely when there are no contributions, but
    // defensively call onComplete so the user never hangs.
    onComplete();
    return null;
  }

  const canBack = index > 0;
  const isLast = index === total - 1;

  function next() {
    if (isLast) {
      onComplete();
      return;
    }
    const nextIndex = index + 1;
    setIndex(nextIndex);
    if (nextIndex > maxSeen) setMaxSeen(nextIndex);
  }

  function back() {
    if (index > 0) setIndex(index - 1);
  }

  return (
    <main className="min-h-screen bg-warm-slate text-white flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-[560px]">
        <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-white/55 mb-4 text-center">
          {index + 1} of {total}
        </div>

        <article className="rounded-2xl bg-[#fdfbf5] text-navy px-7 py-8 lg:px-9 lg:py-10 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)]">
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-3">
            From {current.authorName}
          </div>
          {current.title && (
            <h2 className="text-2xl lg:text-[28px] font-extrabold tracking-[-0.4px] leading-tight text-navy mb-4">
              {current.title}
            </h2>
          )}
          {current.body ? (
            <div
              className="tiptap-editor text-[16px] leading-[1.75] text-ink-mid"
              dangerouslySetInnerHTML={{ __html: current.body }}
            />
          ) : (
            <p className="italic text-ink-light">
              (Non-text contribution — see the list after the reveal to view.)
            </p>
          )}
        </article>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={back}
            disabled={!canBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
            Back
          </button>
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-1.5 bg-gold text-navy px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-gold-light transition-colors"
          >
            {isLast ? "See them all" : "Next"}
            <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>
    </main>
  );
}
