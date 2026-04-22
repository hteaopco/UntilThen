"use client";

import { ChevronRight, Volume2, VolumeX, X } from "lucide-react";
import { useMemo, useState } from "react";

import { LetterCard } from "./LetterCard";
import { PhotoCard } from "./PhotoCard";
import { VoiceCard } from "./VoiceCard";
import type { RevealContribution } from "./RevealClient";

const STORY_LIMIT = 5;

/**
 * Phase 2 — Story Cards.
 *
 * Always-first-five chronological contributions wrapped in a
 * full-screen story-style player. The wrapper owns:
 *
 *   - Progress bar at top (one segment per card, filled / current /
 *     pending)
 *   - Top-left ✕ (jumps to gallery — onClose)
 *   - Top-right 🔊/🔇 mute toggle (Voice card respects it)
 *   - Bottom-center "N / X" counter
 *   - Bottom-right > arrow (advance)
 *   - Tap zones: right half advances, left third goes back. Middle
 *     is a dead zone so card-internal interactions ("Tap to read
 *     more" on Letter, ▶ on Voice) don't accidentally advance.
 *
 * Card body is rendered behind the chrome so each card type can
 * own its full visual treatment. Card components receive `muted`
 * and stop firing audio when true.
 */
export function StoryCards({
  contributions,
  onClose,
  onComplete,
}: {
  /** Full ordered list. We slice to first 5 here. */
  contributions: RevealContribution[];
  /** ✕ button — exits to gallery. */
  onClose: () => void;
  /** Advancing past the last card — moves to Phase 3 (transition). */
  onComplete: () => void;
}) {
  const cards = useMemo(
    () => contributions.slice(0, STORY_LIMIT),
    [contributions],
  );
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(false);

  // Edge case: capsule has zero approved contributions. The page
  // shouldn't have advanced into stories at all, but guard
  // anyway by jumping straight to onComplete.
  if (cards.length === 0) {
    onComplete();
    return null;
  }

  const total = cards.length;
  const current = cards[index];

  function advance() {
    if (index < total - 1) {
      setIndex(index + 1);
    } else {
      onComplete();
    }
  }
  function back() {
    if (index > 0) setIndex(index - 1);
  }

  return (
    <main
      className="fixed inset-0 z-40 bg-cream flex items-center justify-center select-none"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 12px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
      }}
    >
      {/* Progress bar — segments fill as cards complete. */}
      <div
        className="absolute top-0 left-0 right-0 z-30 flex gap-1 px-3"
        style={{ paddingTop: "max(env(safe-area-inset-top), 8px)" }}
        aria-hidden="true"
      >
        {cards.map((_, i) => (
          <div
            key={i}
            className="flex-1 h-[2px] rounded-full bg-navy/15 overflow-hidden"
          >
            <div
              className="h-full bg-amber transition-all duration-200"
              style={{
                width:
                  i < index ? "100%" : i === index ? "100%" : "0%",
                opacity: i === index ? 1 : i < index ? 0.85 : 0,
              }}
            />
          </div>
        ))}
      </div>

      {/* Card body — behind chrome, fills viewport. Cards render
          their own backgrounds. */}
      <div className="relative w-full h-full flex items-stretch justify-center">
        {current.type === "PHOTO" || current.type === "VIDEO" ? (
          <PhotoCard contribution={current} muted={muted} />
        ) : current.type === "VOICE" ? (
          <VoiceCard contribution={current} muted={muted} />
        ) : (
          <LetterCard contribution={current} />
        )}
      </div>

      {/* Tap zones — the left third goes back, the right half
          advances. Middle band is a dead zone for card UI. Sit
          above card body, below header chrome + footer counter
          + interactive card pieces. */}
      <button
        type="button"
        aria-label="Previous card"
        onClick={back}
        className="absolute top-0 bottom-0 left-0 w-1/3 z-10 cursor-default focus:outline-none"
      />
      <button
        type="button"
        aria-label="Next card"
        onClick={advance}
        className="absolute top-0 bottom-0 right-0 w-1/2 z-10 cursor-default focus:outline-none"
      />

      {/* Header: ✕ left, 🔊/🔇 right. z above tap zones. Chrome
          adapts to the card background underneath — Photo cards
          darken it via bg-black/40 (see card impl) so the white
          icons stay readable. */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close story view"
        className="absolute top-3 left-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 backdrop-blur text-navy hover:bg-white transition-colors shadow-[0_2px_8px_rgba(15,31,61,0.08)]"
        style={{ marginTop: "max(env(safe-area-inset-top), 4px)" }}
      >
        <X size={18} strokeWidth={2} />
      </button>
      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        aria-label={muted ? "Unmute" : "Mute"}
        className="absolute top-3 right-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 backdrop-blur text-navy hover:bg-white transition-colors shadow-[0_2px_8px_rgba(15,31,61,0.08)]"
        style={{ marginTop: "max(env(safe-area-inset-top), 4px)" }}
      >
        {muted ? (
          <VolumeX size={18} strokeWidth={2} />
        ) : (
          <Volume2 size={18} strokeWidth={2} />
        )}
      </button>

      {/* Footer: counter + advance arrow. */}
      <div
        className="absolute bottom-0 left-0 right-0 z-30 flex items-center justify-between px-4 pb-3"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
      >
        <span aria-hidden="true" className="text-ink-mid text-[12px] font-semibold tracking-[0.14em] uppercase">
          {/* spacer to balance the right-side arrow */}
          &nbsp;
        </span>
        <span
          aria-live="polite"
          className="text-ink-mid text-[13px] font-semibold tabular-nums tracking-[0.04em] bg-white/70 backdrop-blur px-3 py-1 rounded-full shadow-[0_2px_8px_rgba(15,31,61,0.08)]"
        >
          {index + 1} / {total}
        </span>
        <button
          type="button"
          onClick={advance}
          aria-label={index === total - 1 ? "Continue" : "Next card"}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-amber bg-white text-amber hover:bg-amber hover:text-white transition-colors shadow-[0_4px_12px_rgba(196,122,58,0.18)]"
        >
          <ChevronRight size={22} strokeWidth={2} />
        </button>
      </div>
    </main>
  );
}
