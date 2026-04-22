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
 */
export function GalleryCardView({
  contribution,
  onClose,
}: {
  contribution: RevealContribution;
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

  return (
    <main
      className="fixed inset-0 z-50 bg-cream flex items-stretch justify-center select-none"
      role="dialog"
      aria-modal="true"
      style={{
        paddingTop: "max(env(safe-area-inset-top), 12px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 12px)",
      }}
    >
      <div className="relative w-full h-full">
        {contribution.type === "PHOTO" || contribution.type === "VIDEO" ? (
          <PhotoCard contribution={contribution} muted={false} />
        ) : contribution.type === "VOICE" ? (
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
