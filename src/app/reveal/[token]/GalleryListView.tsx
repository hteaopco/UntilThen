"use client";

import {
  ChevronRight,
  Image as ImageIcon,
  Mail,
  Mic,
  Video,
} from "lucide-react";
import { useMemo } from "react";

import type { RevealContribution } from "./RevealClient";

/**
 * Table-style list view for the gallery. One row per contribution
 * with type / title / from / date, tappable to open the full-screen
 * GalleryCardView modal — same target as the grid tiles.
 *
 * Kept minimal on purpose: the amber type badge replaces any
 * colorful thumbnail, so a long list stays scannable without
 * competing for attention with the grid view.
 */
export function GalleryListView({
  contributions,
  onOpen,
}: {
  contributions: RevealContribution[];
  onOpen: (id: string) => void;
}) {
  return (
    <ul className="rounded-xl border border-navy/[0.08] bg-white overflow-hidden divide-y divide-navy/[0.06]">
      {contributions.map((c) => (
        <li key={c.id}>
          <Row contribution={c} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}

function Row({
  contribution,
  onOpen,
}: {
  contribution: RevealContribution;
  onOpen: (id: string) => void;
}) {
  const preview = useMemo(() => derivePreview(contribution), [contribution]);
  const date = useMemo(
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
      onClick={() => onOpen(contribution.id)}
      className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-amber-tint/40 transition-colors"
    >
      <TypeBadge type={contribution.type} />
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-navy truncate">
          {preview || "(untitled)"}
        </p>
        <p className="mt-0.5 text-[11px] text-ink-light truncate">
          From {contribution.authorName}
          {contribution.collectionTitle
            ? ` · ${contribution.collectionTitle}`
            : ""}
          {" · "}
          {date}
        </p>
      </div>
      <ChevronRight
        size={16}
        strokeWidth={1.75}
        className="text-ink-light shrink-0"
        aria-hidden="true"
      />
    </button>
  );
}

function TypeBadge({
  type,
}: {
  type: RevealContribution["type"];
}) {
  const Icon =
    type === "TEXT"
      ? Mail
      : type === "VOICE"
        ? Mic
        : type === "VIDEO"
          ? Video
          : ImageIcon;
  const label =
    type === "TEXT"
      ? "Letter"
      : type === "VOICE"
        ? "Audio"
        : type === "VIDEO"
          ? "Video"
          : "Photo";
  return (
    <span
      aria-label={label}
      title={label}
      className="shrink-0 inline-flex w-9 h-9 rounded-full bg-amber-tint text-amber items-center justify-center"
    >
      <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
    </span>
  );
}

function derivePreview(c: RevealContribution): string {
  if (c.title?.trim()) return c.title.trim();
  if (!c.body) return "";
  const text = c.body.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > 120 ? text.slice(0, 120) + "…" : text;
}
