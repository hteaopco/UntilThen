"use client";

import { ArrowRight, Sparkles } from "lucide-react";

/**
 * Phase 3 — Transition Screen.
 *
 * Bridge between the cinematic 5-card highlight reel and the full
 * archive. Tells the recipient how much more is waiting and gives
 * them a clear next action.
 *
 * Caller guarantees `remainingCount > 0` — when zero, RevealClient
 * skips this phase entirely so we never render "0 more memories
 * waiting" copy.
 */
export function TransitionScreen({
  remainingCount,
  contributorCount,
  onContinue,
}: {
  remainingCount: number;
  contributorCount: number;
  onContinue: () => void;
}) {
  return (
    <main
      className="fixed inset-0 z-40 flex flex-col items-center justify-center px-6 text-center"
      style={{
        background:
          "radial-gradient(ellipse at 18% 22%, rgba(224, 154, 90, 0.18) 0%, transparent 38%), " +
          "radial-gradient(ellipse at 82% 78%, rgba(196, 122, 58, 0.22) 0%, transparent 42%), " +
          "radial-gradient(ellipse at 50% 50%, rgba(253, 243, 233, 1) 0%, rgba(253, 248, 242, 1) 100%)",
        paddingTop: "max(env(safe-area-inset-top), 24px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
      }}
    >
      <Sparkles
        size={22}
        strokeWidth={1.5}
        className="text-amber mb-6"
        aria-hidden="true"
      />

      <h2 className="font-serif text-navy text-[26px] leading-[1.25] tracking-[-0.3px] max-w-[20ch]">
        That&rsquo;s the highlight reel.
      </h2>

      <p className="mt-4 max-w-[260px] text-[14px] leading-[1.6] text-ink-mid">
        There {remainingCount === 1 ? "is" : "are"} {remainingCount} more memor
        {remainingCount === 1 ? "y" : "ies"} waiting &mdash; letters, photos,
        and voice notes from everyone who loves you.
      </p>

      <p className="mt-6 text-[12px] tracking-[0.18em] uppercase text-amber font-semibold">
        {remainingCount} {remainingCount === 1 ? "memory" : "memories"} ·{" "}
        {contributorCount}{" "}
        {contributorCount === 1 ? "contributor" : "contributors"}
      </p>

      <button
        type="button"
        onClick={onContinue}
        className="mt-10 inline-flex items-center gap-2 rounded-full border border-amber px-7 text-amber text-[15px] font-semibold tracking-[0.01em] hover:bg-amber hover:text-white active:opacity-90 transition-colors"
        style={{ height: "48px" }}
      >
        Explore everything
        <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </main>
  );
}
