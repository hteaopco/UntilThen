"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useMusicDuck } from "./RevealExperience";
import type { RevealContribution } from "./RevealClient";

/**
 * Story Card A — Photo (also handles VIDEO contributions).
 *
 * Full-bleed media with a bottom gradient that anchors a caption
 * + sender attribution. Caption falls back to the contribution's
 * title or first sentence of body if no explicit caption is set.
 *
 * If the image (or video) fails to load, the background falls back
 * to an amber gradient with the sender's initial — never a hard
 * error in the recipient's face.
 */
export function PhotoCard({
  contribution,
  muted,
  onEnded,
}: {
  contribution: RevealContribution;
  muted: boolean;
  /** Optional callback fired when a video finishes playing
   *  through. StoryCards uses it to auto-advance the highlight
   *  reel so the recipient stays hands-free. When set, the
   *  video plays once instead of looping; left undefined (the
   *  GalleryCardView default) the video keeps its loop so a
   *  static viewer can watch repeatedly. Photos are unaffected. */
  onEnded?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const isVideo = contribution.type === "VIDEO";
  const media = useMemo(
    () =>
      contribution.media.find((m) =>
        isVideo ? m.kind === "video" : m.kind === "photo",
      ) ??
      contribution.media[0] ??
      null,
    [contribution.media, isVideo],
  );

  // Duck the reveal's background music whenever an audible
  // (non-muted) video is rendered. Silent looping videos on
  // story cards leave the music bed at its normal volume.
  const { duck, unduck } = useMusicDuck();
  const duckedRef = useRef(false);
  const shouldDuck = isVideo && !failed && !!media && !muted;
  useEffect(() => {
    if (shouldDuck && !duckedRef.current) {
      duckedRef.current = true;
      duck();
    } else if (!shouldDuck && duckedRef.current) {
      duckedRef.current = false;
      unduck();
    }
  }, [shouldDuck, duck, unduck]);
  useEffect(() => {
    return () => {
      if (duckedRef.current) {
        duckedRef.current = false;
        unduck();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const caption = deriveCaption(contribution);
  const initial = (contribution.authorName || "·").trim().charAt(0).toUpperCase();

  return (
    <div className="relative w-full h-full overflow-hidden bg-black">
      {!failed && media ? (
        isVideo && media.kind === "video" ? (
          <video
            src={media.url}
            playsInline
            autoPlay
            muted={muted}
            // Loop only when there's nothing waiting on the
            // video to finish — i.e. the static GalleryCardView
            // where the viewer is paused on this slide. In the
            // story-card flow onEnded is wired up to advance, so
            // a single play-through is correct.
            loop={!onEnded}
            preload="metadata"
            onEnded={() => onEnded?.()}
            onError={() => setFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <>
            {/* Blurred copy of the same image as the backdrop —
                fills the frame without harsh letterbox bars when
                the photo's aspect ratio doesn't match the
                viewport's. The foreground photo below uses
                object-contain so portrait shots aren't cropped
                and landscape shots aren't squashed. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={media.url}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-70"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-black/30"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={media.url}
              alt=""
              onError={() => setFailed(true)}
              className="relative z-[1] w-full h-full object-contain"
            />
          </>
        )
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center text-white text-[64px] font-extrabold"
          style={{
            background:
              "linear-gradient(135deg, #c47a3a 0%, #e09a5a 60%, #fdf3e9 100%)",
          }}
        >
          {initial}
        </div>
      )}

      {/* Bottom gradient anchors the caption text. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-[55%]"
        style={{
          background:
            "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.4) 45%, transparent 100%)",
        }}
      />

      {/* Caption + sender. Sits above the gradient, below the wrapper's
          footer chrome which lives inside StoryCards. */}
      <div
        className="absolute inset-x-0 z-20 px-6"
        style={{ bottom: "max(env(safe-area-inset-bottom), 76px)" }}
      >
        {caption && (
          <p className="text-white text-[16px] leading-[1.4] font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.4)] line-clamp-2">
            {caption}
          </p>
        )}
        <p className="mt-1.5 text-amber-light text-[14px] font-semibold tracking-[0.01em]">
          &mdash; {contribution.authorName}
        </p>
      </div>
    </div>
  );
}

function deriveCaption(c: RevealContribution): string {
  if (c.title?.trim()) return c.title.trim();
  if (!c.body) return "";
  // Strip HTML and trim to a single sentence.
  const text = c.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return "";
  const period = text.indexOf(".");
  if (period !== -1 && period < 140) return text.slice(0, period + 1);
  return text.length > 140 ? text.slice(0, 140) + "…" : text;
}
