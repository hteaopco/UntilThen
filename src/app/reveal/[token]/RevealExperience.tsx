"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { EntryScreen } from "./EntryScreen";
import { GalleryScreen } from "./GalleryScreen";
import { StoryCards } from "./StoryCards";
import { TransitionScreen } from "./TransitionScreen";

const STORY_LIMIT = 5;

export type RevealMedia = {
  kind: "photo" | "voice" | "video";
  url: string;
};

export type RevealContribution = {
  id: string;
  authorName: string;
  authorAvatarUrl: string | null;
  type: "TEXT" | "PHOTO" | "VOICE" | "VIDEO";
  title: string | null;
  body: string | null;
  media: RevealMedia[];
  createdAt: string;
  /** Optional grouping — populated for vault entries that belong
   *  to a Collection, null for Main Diary entries and for every
   *  gift-capsule contribution. When any contribution carries a
   *  collection, the gallery shows collection filter chips. */
  collectionTitle?: string | null;
};

export type RevealCapsule = {
  id: string;
  title: string;
  recipientName: string;
  occasionType: string;
  tone: string;
  revealDate: string;
  isFirstOpen: boolean;
  hasCompleted: boolean;
};

type Phase = "entry" | "stories" | "transition" | "gallery";

/**
 * Pure phase state machine — takes a fully-loaded capsule +
 * contributions and renders the four-phase reveal experience.
 *
 * No data fetching, no token handling, no error states. Both the
 * real recipient route (RevealClient → fetch → here) and the
 * admin mock preview (MockRevealPreview → seed data → here) drop
 * into this component, so they exercise the exact same screens.
 *
 * Phase progression:
 *   entry → stories → transition → gallery
 *   (transition is skipped when contributions ≤ STORY_LIMIT)
 *
 * Returning visits (capsule.hasCompleted) start in the gallery
 * directly — the cinematic intro is a one-shot.
 */
export function RevealExperience({
  capsule,
  contributions,
  onCompleted,
}: {
  capsule: RevealCapsule;
  contributions: RevealContribution[];
  /** Fires once, the first time the recipient reaches the gallery
   *  in this session. The wrapper is responsible for any server-
   *  side stamping (POST /api/reveal/{token}/complete). Optional
   *  so the admin mock preview can omit it. */
  onCompleted?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>(() =>
    capsule.hasCompleted ? "gallery" : "entry",
  );

  const remaining = Math.max(0, contributions.length - STORY_LIMIT);
  const contributorCount = useMemo(
    () =>
      new Set(contributions.map((c) => c.authorName.trim()).filter(Boolean))
        .size,
    [contributions],
  );

  // Fire the one-time completion callback the very first time
  // gallery becomes the active phase in this session — including
  // returning visits where the gallery is the entry phase.
  const completedFired = useRef(false);
  useEffect(() => {
    if (phase === "gallery" && !completedFired.current) {
      completedFired.current = true;
      onCompleted?.();
    }
  }, [phase, onCompleted]);

  // Wrap each phase in a keyed div so React remounts on phase
  // change and the CSS fade-in animation re-runs. 300ms matches
  // the brief's "phase transitions: opacity fade, 300ms ease".
  const phaseContent = (() => {
    if (phase === "entry") {
      return (
        <EntryScreen
          recipientName={capsule.recipientName}
          revealDate={capsule.revealDate}
          onBegin={() =>
            setPhase(contributions.length === 0 ? "gallery" : "stories")
          }
        />
      );
    }
    if (phase === "stories") {
      return (
        <StoryCards
          contributions={contributions}
          // ✕ from stories jumps straight to gallery (brief
          // explicitly says "exits to gallery immediately").
          // Reaching the end of the deck routes through the
          // transition screen first.
          onClose={() => setPhase("gallery")}
          onComplete={() =>
            setPhase(remaining > 0 ? "transition" : "gallery")
          }
        />
      );
    }
    if (phase === "transition") {
      return (
        <TransitionScreen
          remainingCount={remaining}
          contributorCount={contributorCount}
          onContinue={() => setPhase("gallery")}
        />
      );
    }
    return (
      <GalleryScreen
        recipientName={capsule.recipientName}
        contributions={contributions}
        onReplay={() => {
          // Replay is session-only — recipientCompletedAt is not
          // reset on the server. The recipient gets the cinematic
          // intro again, then lands back here.
          setPhase("entry");
        }}
      />
    );
  })();

  return (
    <div key={phase} className="reveal-phase">
      {phaseContent}
      <style jsx global>{`
        .reveal-phase {
          animation: revealPhaseFade 300ms ease-out both;
        }
        @keyframes revealPhaseFade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
