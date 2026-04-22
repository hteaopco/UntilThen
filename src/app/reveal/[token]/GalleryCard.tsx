"use client";

import { Image as ImageIcon, Mail, Mic, Video } from "lucide-react";
import { useMemo } from "react";

import type { RevealContribution } from "./RevealClient";

/**
 * One tile in the masonry gallery grid (Phase 4).
 *
 * Shape varies by contribution type:
 *   - Letter / TEXT  → cream + amber gradient thumbnail with ✉ glyph
 *   - Photo         → actual photo (signed R2 URL)
 *   - Voice         → navy thumbnail with 🎙 glyph
 *   - Video         → photo-style poster fallback (no inline preview;
 *                     opening the card shows the video itself)
 *
 * The body underneath holds the sender, a 2-line preview/caption,
 * and the date written.
 */
export function GalleryCard({
  contribution,
  onClick,
}: {
  contribution: RevealContribution;
  onClick: () => void;
}) {
  const preview = useMemo(() => derivePreview(contribution), [contribution]);
  const dateLabel = useMemo(
    () =>
      new Date(contribution.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    [contribution.createdAt],
  );

  return (
    <button
      type="button"
      onClick={onClick}
      // break-inside avoid keeps each tile from splitting across the
      // CSS columns that the parent uses for masonry packing.
      className="block w-full text-left rounded-xl border border-navy/[0.08] bg-white overflow-hidden break-inside-avoid mb-3 hover:border-amber/30 hover:shadow-[0_6px_20px_rgba(15,31,61,0.06)] transition-all"
    >
      <Thumbnail contribution={contribution} />
      <div className="px-3 py-3">
        <p className="text-[12px] font-semibold text-warm-slate truncate">
          {contribution.authorName}
        </p>
        {preview && (
          <p className="mt-1 text-[11px] text-ink-mid leading-[1.45] line-clamp-2">
            {preview}
          </p>
        )}
        <p className="mt-1.5 text-[10px] text-ink-light">{dateLabel}</p>
      </div>
    </button>
  );
}

function Thumbnail({ contribution }: { contribution: RevealContribution }) {
  const photo = contribution.media.find((m) => m.kind === "photo");
  const isVoice = contribution.type === "VOICE";
  const isVideo = contribution.type === "VIDEO";
  const isLetter = contribution.type === "TEXT";

  if (photo) {
    return (
      <div className="relative w-full" style={{ height: "120px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt=""
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <TypeBadge label={isVideo ? "VIDEO" : "PHOTO"} icon={isVideo ? "video" : "photo"} />
      </div>
    );
  }

  if (isVoice) {
    return (
      <div
        className="relative w-full flex items-center justify-center text-amber"
        style={{
          height: "120px",
          background:
            "radial-gradient(ellipse at 50% 40%, rgba(196,122,58,0.2) 0%, transparent 60%), linear-gradient(180deg, #0f1f3d 0%, #060d22 100%)",
        }}
      >
        <Mic size={32} strokeWidth={1.5} aria-hidden="true" />
        <TypeBadge label="VOICE" icon="voice" />
      </div>
    );
  }

  // Letter (TEXT) or fallback when a photo/video has no media URL
  // attached (e.g. upload was skipped) — same warm gradient, mail
  // glyph instead of mic.
  if (isLetter) {
    return (
      <div
        className="relative w-full flex items-center justify-center text-amber"
        style={{
          height: "120px",
          background:
            "linear-gradient(135deg, #fdf3e9 0%, rgba(196,122,58,0.25) 100%)",
        }}
      >
        <Mail size={32} strokeWidth={1.5} aria-hidden="true" />
        <TypeBadge label="LETTER" icon="letter" />
      </div>
    );
  }

  return (
    <div
      className="relative w-full flex items-center justify-center text-amber"
      style={{
        height: "120px",
        background:
          "linear-gradient(135deg, #fdf3e9 0%, rgba(196,122,58,0.25) 100%)",
      }}
    >
      <ImageIcon size={32} strokeWidth={1.5} aria-hidden="true" />
      <TypeBadge label={contribution.type} icon="photo" />
    </div>
  );
}

function TypeBadge({
  label,
  icon,
}: {
  label: string;
  icon: "letter" | "photo" | "voice" | "video";
}) {
  const Icon =
    icon === "letter" ? Mail : icon === "voice" ? Mic : icon === "video" ? Video : ImageIcon;
  return (
    <span className="absolute top-2 left-2 inline-flex items-center gap-1 bg-black/55 text-white text-[9px] font-bold tracking-[0.12em] uppercase px-2 py-0.5 rounded-full">
      <Icon size={10} strokeWidth={2} aria-hidden="true" />
      {label}
    </span>
  );
}

function derivePreview(c: RevealContribution): string {
  if (c.title?.trim()) return c.title.trim();
  if (!c.body) return "";
  const text = c.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 160 ? text.slice(0, 160) + "…" : text;
}
