"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { EntryScreen } from "./EntryScreen";
import { GalleryScreen } from "./GalleryScreen";
import { GateScreen } from "./GateScreen";
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
/** Base music volume. Voice recordings play at 1.0, video audio
 *  at whatever the source encodes to, so we keep the bed quiet
 *  enough that narration reads cleanly. */
const MUSIC_VOLUME = 0.25;
/** Ducked volume while a voice card or non-muted video is
 *  actively playing. Pushed low so narration cuts cleanly
 *  through the bed (it was 0.15 but audio tests showed the
 *  bed still competed with voice recordings). */
const MUSIC_DUCKED_VOLUME = 0.05;

/**
 * Any reveal card that produces audio calls duck() on play and
 * unduck() on pause / end / unmount. The provider refcounts the
 * active audio sources so multiple overlapping plays (unlikely
 * in practice but possible) don't un-duck prematurely.
 */
type MusicDuckApi = {
  duck: () => void;
  unduck: () => void;
};
const MusicDuckContext = createContext<MusicDuckApi | null>(null);

export function useMusicDuck(): MusicDuckApi {
  const ctx = useContext(MusicDuckContext);
  return (
    ctx ?? {
      duck: () => {
        /* no-op outside provider (admin mock preview) */
      },
      unduck: () => {
        /* no-op */
      },
    }
  );
}

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

type Phase = "gate" | "entry" | "stories" | "transition" | "gallery";

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
export type RevealCuratedSlide = {
  entryId: string;
  view: "letter" | "VOICE" | "PHOTO" | "VIDEO";
};

export function RevealExperience({
  capsule,
  contributions,
  onCompleted,
  variant = "capsule",
  curatedSlides,
  musicUrl,
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
  /** When provided (BUILD mode), the highlight reel uses these
   *  exact slides in order instead of auto-expanding the
   *  contributions array. Each slide picks one modality from one
   *  contribution. */
  curatedSlides?: RevealCuratedSlide[];
  /** Override for the background music URL. Falls back to the
   *  global NEXT_PUBLIC_REVEAL_MUSIC_URL when not set. Used by
   *  vault reveals where the owner picks a per-vault song. */
  musicUrl?: string | null;
}) {
  const effectiveMusicUrl = musicUrl ?? MUSIC_URL;
  // Returning visitors skip both gate + entry — they already
  // saw the cinematic flow and we drop them in the gallery.
  // First-timers start at the gate so the single tap (a) grants
  // audio autoplay permission and (b) triggers the entry fade.
  const [phase, setPhase] = useState<Phase>(() =>
    capsule.hasCompleted ? "gallery" : "gate",
  );
  // Muted state is hoisted to the root so the story-card ✕ chrome
  // toggle, the gallery music button, the embedded voice cards,
  // and the background music element all stay in sync. One mute
  // switch kills everything.
  const [muted, setMuted] = useState(false);

  // Background music. Ref-held so it survives phase changes
  // without remounting; ignored entirely when no URL is set.
  const musicRef = useRef<HTMLAudioElement | null>(null);
  // Count of currently-playing voice / video sources. Music
  // stays ducked while > 0. Using a ref + setter so duck/unduck
  // stays referentially stable across re-renders.
  const duckCountRef = useRef(0);
  const [, setDuckTick] = useState(0);
  // While fading to silent, duck/unduck calls no-op so they
  // can't fight the fade's ramp. Any in-flight fade timer also
  // bails when the element is torn down.
  const fadingRef = useRef(false);
  const fadeTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startMusic = useCallback(() => {
    if (!effectiveMusicUrl) return;
    if (musicRef.current) return;
    // A previous fade may have torn the element down — fadingRef
    // stays true until we're ready for a fresh start.
    fadingRef.current = false;
    if (fadeTimerRef.current !== null) {
      clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
    const el = new Audio(effectiveMusicUrl);
    el.loop = true;
    el.volume = duckCountRef.current > 0 ? MUSIC_DUCKED_VOLUME : MUSIC_VOLUME;
    el.muted = muted;
    el.play().catch(() => {
      // Autoplay blocked, file failed, etc. — silently run
      // without music rather than prompting or erroring.
    });
    musicRef.current = el;
  }, [muted, effectiveMusicUrl]);

  /**
   * Smooth linear fade-out when the recipient leaves the
   * highlight reel for the gallery. 25 ticks × 120ms = 3s from
   * current volume down to 0, then pause + tear down.
   *
   * Small step + short interval makes the ramp feel continuous
   * rather than stair-stepped, which is what the earlier 5-step
   * version sounded like — the drops were audible and read as
   * "abrupt" rather than fade. Ducked state is honored: we ramp
   * down from whatever volume the bed was at when fade started.
   */
  const fadeOutMusic = useCallback(() => {
    if (!musicRef.current) return;
    if (fadingRef.current) return;
    fadingRef.current = true;

    const TICKS = 25;
    const STEP_MS = 120;
    const startVol = musicRef.current.volume;
    let tick = 0;

    fadeTimerRef.current = setInterval(() => {
      if (!musicRef.current) {
        if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
        fadeTimerRef.current = null;
        fadingRef.current = false;
        return;
      }
      tick += 1;
      if (tick < TICKS) {
        // Linear ramp — Math.max clamps floating-point drift.
        const nextVol = Math.max(0, startVol * (1 - tick / TICKS));
        musicRef.current.volume = nextVol;
        return;
      }
      // Final tick — silence + tear down so startMusic() can
      // spin up a fresh element later (e.g. on replay).
      musicRef.current.volume = 0;
      if (fadeTimerRef.current) clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
      musicRef.current.pause();
      musicRef.current.src = "";
      musicRef.current = null;
      fadingRef.current = false;
    }, STEP_MS);
  }, []);

  // Mirror mute state to the music element any time it flips.
  useEffect(() => {
    if (musicRef.current) {
      musicRef.current.muted = muted;
    }
  }, [muted]);

  // Stop music on unmount (tab close, route change, etc.).
  useEffect(() => {
    return () => {
      if (fadeTimerRef.current !== null) {
        clearInterval(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
      if (musicRef.current) {
        musicRef.current.pause();
        musicRef.current.src = "";
        musicRef.current = null;
      }
    };
  }, []);

  // When the recipient lands in the gallery — whether via the
  // transition screen's 'Explore everything' CTA, by ending the
  // story deck when there were only five memories (no transition
  // screen), or by tapping ✕ to exit stories early — fade the
  // music out. Gallery is a reflective surface; the bed carries
  // through the guided reveal and then lets the memories speak.
  useEffect(() => {
    if (phase === "gallery" && musicRef.current) {
      fadeOutMusic();
    }
  }, [phase, fadeOutMusic]);

  const duck = useCallback(() => {
    if (fadingRef.current) return;
    duckCountRef.current += 1;
    if (musicRef.current) {
      musicRef.current.volume = MUSIC_DUCKED_VOLUME;
    }
    setDuckTick((n) => n + 1);
  }, []);
  const unduck = useCallback(() => {
    if (fadingRef.current) return;
    duckCountRef.current = Math.max(0, duckCountRef.current - 1);
    if (musicRef.current && duckCountRef.current === 0) {
      musicRef.current.volume = MUSIC_VOLUME;
    }
    setDuckTick((n) => n + 1);
  }, []);
  const musicDuckApi = useMemo<MusicDuckApi>(
    () => ({ duck, unduck }),
    [duck, unduck],
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
    if (phase === "gate") {
      return (
        <GateScreen
          onEnter={() => {
            // This tap is the autoplay-unlocking user gesture.
            // Start the bed here BEFORE transitioning so the
            // entry screen fades in with music already playing.
            startMusic();
            setPhase("entry");
          }}
        />
      );
    }
    if (phase === "entry") {
      return (
        <EntryScreen
          recipientName={capsule.recipientName}
          revealDate={capsule.revealDate}
          onBegin={() => {
            // Music already started on mount (or on the first
            // document-level tap for iOS) — nothing to do here
            // audio-wise.
            setPhase(contributions.length === 0 ? "gallery" : "stories");
          }}
        />
      );
    }
    if (phase === "stories") {
      return (
        <StoryCards
          contributions={contributions}
          curatedSlides={curatedSlides}
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
        musicEnabled={Boolean(effectiveMusicUrl)}
        onReplay={() => {
          // Replay is session-only — recipientCompletedAt is not
          // reset on the server. The recipient gets the cinematic
          // intro again, then lands back here. The replay tap
          // itself is a user gesture, so it's safe to spin up a
          // fresh music element (the previous one was torn down
          // by the gallery-entering fade-out) without running
          // into autoplay restrictions.
          startMusic();
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
  return (
    <MusicDuckContext.Provider value={musicDuckApi}>
      <div key={phase}>{phaseContent}</div>
    </MusicDuckContext.Provider>
  );
}
