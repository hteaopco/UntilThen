"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { EntryScreen } from "./EntryScreen";
import { GalleryScreen } from "./GalleryScreen";
import { StoryCards } from "./StoryCards";
import { TransitionScreen } from "./TransitionScreen";

const STORY_LIMIT = 5;

/**
 * Background music URL — set NEXT_PUBLIC_REVEAL_MUSIC_URL to a
 * hot-linkable MP3 (public CDN or /public asset, e.g.
 * /reveal-music.mp3). When unset, the reveal runs silent and
 * every music-related UI stays hidden. Recommended vibe: soft
 * strings / ambient, 2–4 min seamless loop so the loop point
 * isn't obvious.
 */
const MUSIC_URL = process.env.NEXT_PUBLIC_REVEAL_MUSIC_URL ?? "";
const MUSIC_VOLUME = 0.25;

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
  variant = "capsule",
}: {
  capsule: RevealCapsule;
  contributions: RevealContribution[];
  /** Fires once, the first time the recipient reaches the gallery
   *  in this session. The wrapper is responsible for any server-
   *  side stamping (POST /api/reveal/{token}/complete). Optional
   *  so the admin mock preview can omit it. */
  onCompleted?: () => void;
  /** Which product surface is driving the experience. Gift
   *  capsules have contributors (and the gallery shows a 'From'
   *  filter row + 'people who love you' subhead). Vaults are
   *  parent-authored by default (contributor filter hidden,
   *  subhead trimmed to just the counts). Defaults to capsule. */
  variant?: "capsule" | "vault";
}) {
  const [phase, setPhase] = useState<Phase>(() =>
    capsule.hasCompleted ? "gallery" : "entry",
  );
  // Muted state is hoisted to the root so the story-card ✕ chrome
  // toggle, the gallery music button, the embedded voice cards,
  // and the background music element all stay in sync. One mute
  // switch kills everything.
  const [muted, setMuted] = useState(false);

  // Background music. Ref-held so it survives phase changes
  // without remounting; ignored entirely when no URL is set.
  const musicRef = useRef<HTMLAudioElement | null>(null);

  // Start music on the first Begin tap (the user gesture iOS
  // requires). Kept as a fire-and-forget — if the file 404s or
  // the browser rejects, we silently run without music.
  function startMusic() {
    if (!MUSIC_URL) return;
    if (musicRef.current) return;
    const el = new Audio(MUSIC_URL);
    el.loop = true;
    el.volume = MUSIC_VOLUME;
    el.muted = muted;
    el.play().catch(() => {
      // Autoplay blocked, file failed, etc. — silently run
      // without music rather than prompting or erroring.
    });
    musicRef.current = el;
  }

  // Mirror mute state to the music element any time it flips.
  useEffect(() => {
    if (musicRef.current) {
      musicRef.current.muted = muted;
    }
  }, [muted]);

  // Stop music on unmount (tab close, route change, etc.).
  useEffect(() => {
    return () => {
      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current.src = "";
        musicRef.current = null;
      }
    };
  }, []);

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
          onBegin={() => {
            // This tap is the iOS autoplay gesture — kick off
            // music here, before state change triggers a
            // re-render.
            startMusic();
            setPhase(contributions.length === 0 ? "gallery" : "stories");
          }}
        />
      );
    }
    if (phase === "stories") {
      return (
        <StoryCards
          contributions={contributions}
          muted={muted}
          onToggleMuted={() => setMuted((m) => !m)}
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
        variant={variant}
        muted={muted}
        onToggleMuted={() => setMuted((m) => !m)}
        musicEnabled={Boolean(MUSIC_URL)}
        onReplay={() => {
          // Replay is session-only — recipientCompletedAt is not
          // reset on the server. The recipient gets the cinematic
          // intro again, then lands back here.
          setPhase("entry");
        }}
      />
    );
  })();

  // Return the phase content directly, keyed by phase so React
  // still remounts between phases. NOTE: we deliberately do NOT
  // wrap in an opacity-animated div. Such a wrapper creates a
  // stacking context during its fade (opacity < 1), which would
  // sandbox the phase's fixed/z-[260] takeovers (StoryCards,
  // TransitionScreen, ExpandedLetter, GalleryCardView) beneath
  // the organiser / vault preview top bar (z-[250]). Keeping the
  // phase root un-wrapped lets each takeover stack against the
  // preview bar at the document root level.
  return <div key={phase}>{phaseContent}</div>;
}
