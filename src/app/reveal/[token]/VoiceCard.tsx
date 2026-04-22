"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ContributorAvatar } from "@/components/ui/ContributorAvatar";

import { useRevealAnalytics } from "./analytics";
import type { RevealContribution } from "./RevealClient";

/**
 * Story Card C — Voice.
 *
 * Dark navy backdrop, large amber avatar, sender name +
 * subtext, decorative waveform, and a play/pause control.
 *
 * Audio NEVER auto-plays — the recipient has to tap to start
 * (matches the brief and avoids autoplay-policy issues on iOS
 * Safari). When playback ends, the wrapper's > arrow can pulse
 * to prompt the next card; we just emit no-op for now and let
 * StoryCards' chrome do its thing.
 */
export function VoiceCard({
  contribution,
  muted,
}: {
  contribution: RevealContribution;
  muted: boolean;
}) {
  const { capture } = useRevealAnalytics();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState<number>(0);
  const [position, setPosition] = useState<number>(0);

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
    }
  }, [muted]);

  // Reset internal position state if the contribution changes
  // (i.e. we re-mount in a different story slot).
  useEffect(() => {
    setPosition(0);
    setDuration(0);
    setPlaying(false);
  }, [contribution.id]);

  function toggle() {
    const el = audioRef.current;
    if (!el || muted) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      el.play().then(
        () => {
          setPlaying(true);
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
