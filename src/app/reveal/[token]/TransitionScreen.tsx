"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect } from "react";

import { useRevealAnalytics } from "./analytics";

/**
 * Phase 3 — Transition Screen.
 *
 * Bridge between the cinematic highlight reel (up to STORY_LIMIT
 * cards) and the full gallery. Tells the recipient how many
 * memories are waiting and gives them a clear next action.
 *
 * Always renders after stories now (regardless of contribution
 * count). Two copy variants:
 *
 *   remainingCount > 0 — "There are X more memories waiting…"
 *     Cinematic reel covered the highlights; the gallery has X
 *     unseen memories.
 *
 *   remainingCount = 0 — "There are X memories waiting…"
 *     Capsule had ≤ STORY_LIMIT contributions, so the reel showed
 *     all of them. The gallery is the same content, just in a
 *     browse-and-search shape. Drops "more" so the copy doesn't
 *     read as "0 more".
 *
 * The bottom subtitle always shows totals (X memories · Y
 * contributors) so the recipient sees how big their archive is
 * regardless of which copy variant fires.
 */
export function TransitionScreen({
  remainingCount,
  totalCount,
  contributorCount,
  onContinue,
}: {
  remainingCount: number;
  totalCount: number;
  contributorCount: number;
  onContinue: () => void;
}) {
  const { capture } = useRevealAnalytics();
  useEffect(() => {
    capture("reveal_transition_viewed", {
      remainingCount,
      totalCount,
      contributorCount,
    });
  }, [capture, remainingCount, totalCount, contributorCount]);

  // Body copy: "more" only when there are actually more memories
  // beyond what the highlight reel showed.
  const bodyCount = remainingCount > 0 ? remainingCount : totalCount;
  const bodyVerb = bodyCount === 1 ? "is" : "are";
  const bodyNoun = bodyCount === 1 ? "memory" : "memories";
  const moreSuffix = remainingCount > 0 ? " more" : "";

  return (
    <main
      // z-[260] so the 'Explore everything' CTA and headline
      // aren't partially covered by the preview top bar
      // (z-[250]) during the gift-capsule / vault preview flows.
      className="fixed inset-0 z-[260] flex flex-col items-center justify-center px-6 text-center"
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
        There {bodyVerb} {bodyCount}{moreSuffix} {bodyNoun} waiting &mdash;
        letters, photos, and voice notes from everyone who loves you.
      </p>

      <p className="mt-6 text-[12px] tracking-[0.18em] uppercase text-amber font-semibold">
        {totalCount} {totalCount === 1 ? "memory" : "memories"} ·{" "}
        {contributorCount}{" "}
        {contributorCount === 1 ? "contributor" : "contributors"}
      </p>

      <button
        type="button"
        onClick={() => {
          capture("reveal_transition_continued");
          onContinue();
        }}
        className="mt-10 inline-flex items-center gap-2 rounded-full border border-amber px-7 text-amber text-[15px] font-semibold tracking-[0.01em] hover:bg-amber hover:text-white active:opacity-90 transition-colors"
        style={{ height: "48px" }}
      >
        Explore everything
        <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
      </button>
    </main>
  );
}
