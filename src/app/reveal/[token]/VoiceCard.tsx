"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ContributorAvatar } from "@/components/ui/ContributorAvatar";

import { useRevealAnalytics } from "./analytics";
import { useMusicDuck } from "./RevealExperience";
import type { RevealContribution } from "./RevealClient";

/**
 * Story Card C — Voice.
 *
 * Dark navy backdrop, large amber avatar, sender name +
 * subtext, decorative waveform, and a play/pause control.
 *
 * On the highlight reel, playback now auto-starts when the card
 * becomes the current slide — the recipient has already tapped
 * the gate to enter, which unlocks audio playback on iOS, so
 * the voice note fades in naturally as part of the cinematic
 * flow. If the browser blocks autoplay for any reason the user
 * still has the manual Play button as a fallback. The same
 * component gets used in GalleryCardView (post-reveal open)
 * where we do NOT want auto-play — the `autoPlay` prop lets the
 * caller opt out.
 */
export function VoiceCard({
  contribution,
  muted,
  autoPlay = false,
  onEnded,
}: {
  contribution: RevealContribution;
  muted: boolean;
  /** When true and the card mounts un-muted, try to play right
   *  away. StoryCards passes true; GalleryCardView leaves it
   *  default (false). */
  autoPlay?: boolean;
  /** Optional callback fired when the audio finishes playing.
   *  StoryCards uses it to auto-advance to the next slide so a
   *  recipient can sit through the reveal hands-free; the static
   *  GalleryCardView leaves it undefined (the gallery view stays
   *  put after playback). */
  onEnded?: () => void;
}) {
  const { capture } = useRevealAnalytics();
  const { duck, unduck } = useMusicDuck();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Track the duck state locally so we can release it on unmount
  // or when the contribution changes, without relying on the
  // audio element's pause event firing reliably across browsers.
  const duckedRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number>(0);
  const [position, setPosition] = useState<number>(0);

  function applyDuck() {
    if (!duckedRef.current) {
      duckedRef.current = true;
      duck();
    }
  }
  function releaseDuck() {
    if (duckedRef.current) {
      duckedRef.current = false;
      unduck();
    }
  }

  const audio = useMemo(
    () => contribution.media.find((m) => m.kind === "voice") ?? null,
    [contribution.media],
  );

  // Stop playback whenever the parent flips to muted, so the
  // global mute toggle in StoryCards actually silences us.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (muted && !el.paused) {
      el.pause();
      setPlaying(false);
      releaseDuck();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [muted]);

  // Reset internal position state if the contribution changes
  // (i.e. we re-mount in a different story slot).
  useEffect(() => {
    setPosition(0);
    setDuration(0);
    setPlaying(false);
    releaseDuck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contribution.id]);

  // Safety net: release any held duck on unmount so music doesn't
  // stay stuck at the ducked volume after the card is gone.
  useEffect(() => {
    return () => {
      releaseDuck();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-start playback on mount when the caller opts in. Tries
  // play() immediately; on iOS Safari freshly-created audio
  // elements often need their own user gesture, so a rejection
  // is fine — the manual Play button still works. We also retry
  // once on canplaythrough in case the first call lost the race
  // with element readiness.
  useEffect(() => {
    if (!autoPlay || muted) return;
    const el = audioRef.current;
    if (!el) return;
    let cancelled = false;
    el.preload = "auto";
    let played = false;
    const tryPlay = () => {
      if (cancelled || played) return;
      played = true;
      el.play().then(
        () => {
          if (cancelled) return;
          setPlaying(true);
          applyDuck();
          capture("reveal_voice_played", {
            contributionId: contribution.id,
            authorName: contribution.authorName,
            source: "autoplay",
          });
        },
        () => {
          // First attempt blocked. Reset so a later canplaythrough
          // can try once more — sometimes iOS lets the second go.
          played = false;
        },
      );
    };
    tryPlay();
    el.addEventListener("canplaythrough", tryPlay, { once: true });
    return () => {
      cancelled = true;
      el.removeEventListener("canplaythrough", tryPlay);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contribution.id, autoPlay, muted]);

  function toggle() {
    const el = audioRef.current;
    if (!el || muted) return;
    if (playing) {
      el.pause();
      setPlaying(false);
      releaseDuck();
    } else {
      el.play().then(
        () => {
          setPlaying(true);
          applyDuck();
          capture("reveal_voice_played", {
            contributionId: contribution.id,
            authorName: contribution.authorName,
          });
        },
        () => setPlaying(false),
      );
    }
  }

  const initial =
    (contribution.authorName || "·").trim().charAt(0).toUpperCase() || "·";
  const subtext = duration > 0 ? `Voice message · ${formatTime(duration)}` : "A little note for you.";

  return (
    <div
      className="relative w-full h-full overflow-hidden flex flex-col items-center justify-center text-navy px-6"
      style={{
        background:
          "radial-gradient(ellipse at 50% 28%, rgba(224, 154, 90, 0.22) 0%, transparent 55%), " +
          "radial-gradient(ellipse at 50% 90%, rgba(196, 122, 58, 0.14) 0%, transparent 45%), " +
          "linear-gradient(180deg, #fdf3e9 0%, #fdf8f2 100%)",
      }}
    >
      <div className="flex flex-col items-center text-center">
        {contribution.authorAvatarUrl ? (
          <ContributorAvatar
            name={contribution.authorName}
            imageUrl={contribution.authorAvatarUrl}
            size={88}
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-[88px] w-[88px] items-center justify-center rounded-full text-white text-[34px] font-extrabold"
            style={{
              background:
                "linear-gradient(135deg, #c47a3a 0%, #e09a5a 100%)",
              boxShadow: "0 8px 24px rgba(196,122,58,0.25)",
            }}
          >
            {initial}
          </span>
        )}
        <p className="mt-5 font-sans font-semibold text-[20px] tracking-[-0.2px] text-navy">
          {contribution.authorName}
        </p>
        <p className="mt-1 text-[13px] text-ink-mid">{subtext}</p>
      </div>

      {/* Decorative waveform — purely visual, not tied to the
          actual audio data. Bars roughly mimic an amplitude curve.
          Kept inert (aria-hidden) so screen readers skip it. */}
      <div
        aria-hidden="true"
        className="mt-10 flex h-[56px] w-full max-w-[280px] items-center justify-center gap-[3px]"
      >
        {WAVEFORM_HEIGHTS.map((h, i) => (
          <span
            key={i}
            className="block w-[3px] rounded-full bg-amber/80"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={toggle}
        disabled={muted || !audio}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
        className="relative z-20 mt-10 flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-amber bg-white text-amber hover:bg-amber hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ boxShadow: "0 8px 24px rgba(196,122,58,0.18)" }}
      >
        {playing ? (
          <Pause size={28} strokeWidth={2} />
        ) : (
          <Play size={28} strokeWidth={2} className="ml-0.5" />
        )}
      </button>

      <p className="mt-5 text-ink-mid text-[12px] tabular-nums tracking-wide">
        {formatTime(position)} / {duration > 0 ? formatTime(duration) : "--:--"}
      </p>

      {audio && (
        <audio
          ref={audioRef}
          src={audio.url}
          preload="metadata"
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
          onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime || 0)}
          onEnded={() => {
            setPlaying(false);
            setPosition(duration);
            releaseDuck();
            onEnded?.();
          }}
        />
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// 32 bars, vaguely amplitude-shaped curve (low edges, peaks
// around 60-90% in the middle). Hand-tuned for visual balance.
const WAVEFORM_HEIGHTS = [
  20, 32, 44, 38, 56, 70, 62, 78, 88, 72, 58, 66, 84, 92, 76, 64, 70, 86, 78,
  60, 72, 80, 64, 50, 58, 66, 44, 38, 30, 22, 18, 14,
];
