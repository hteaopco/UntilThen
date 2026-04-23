"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

import { LetterCard } from "./LetterCard";
import { PhotoCard } from "./PhotoCard";
import { VoiceCard } from "./VoiceCard";
import type { RevealContribution } from "./RevealClient";

/**
 * Full-screen view of a single contribution opened from the
 * gallery. Reuses the three card components from Phase 2 — same
 * visual treatment per type — minus the StoryCards chrome
 * (progress bar, mute, counter, > arrow). Just the content + a
 * close button in the top-left.
 *
 * When a type filter is active on the gallery (Audio / Photos /
 * Videos) and the recipient opens a multi-modal entry, the
 * caller passes `forceView` so we render the matching modality
 * card instead of defaulting to the entry's primary type — i.e.
 * tapping a letter-with-voice under the Audio chip opens as
 * VoiceCard.
 */
export function GalleryCardView({
  contribution,
  forceView,
  onClose,
}: {
  contribution: RevealContribution;
  /** Filter context — when set, overrides the card type chosen
   *  by RevealContribution.type. */
  forceView?: "TEXT" | "VOICE" | "PHOTO" | "VIDEO";
  onClose: () => void;
}) {
  // Esc closes too — keyboard parity with the visible ✕ button.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const view = forceView ?? contribution.type;
  // Photo/Video cards key off contribution.type internally —
  // pass a variant with type overridden so the right modality
  // renders for multi-modal entries opened under a filter.
  const forPhotoOrVideo =
    (view === "PHOTO" || view === "VIDEO") && contribution.type !== view
      ? { ...contribution, type: view }
      : contribution;

  return (
    <main
      className="fixed inset-0 z-[260] bg-cream flex items-stretch justify-center select-none"
      role="dialog"
      aria-modal="true"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 12px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
      }}
    >
      <div className="relative w-full h-full">
        {view === "PHOTO" || view === "VIDEO" ? (
          <PhotoCard contribution={forPhotoOrVideo} muted={false} />
        ) : view === "VOICE" ? (
          <VoiceCard contribution={contribution} muted={false} />
        ) : (
          <LetterCard contribution={contribution} />
        )}
      </div>

      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-3 left-3 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 backdrop-blur text-navy hover:bg-white transition-colors shadow-[0_2px_8px_rgba(15,31,61,0.08)]"
        style={{ marginTop: "max(env(safe-area-inset-top), 4px)" }}
      >
        <X size={18} strokeWidth={2} />
      </button>
    </main>
  );
}
