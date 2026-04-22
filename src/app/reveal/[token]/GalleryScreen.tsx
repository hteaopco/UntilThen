"use client";

import {
  Image as ImageIcon,
  Mail,
  Mic,
  RotateCcw,
  Video,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { GalleryCard } from "./GalleryCard";
import { GalleryCardView } from "./GalleryCardView";
import type { RevealContribution } from "./RevealClient";

type Filter =
  | { kind: "all" }
  | { kind: "type"; type: "TEXT" | "PHOTO" | "VOICE" | "VIDEO" }
  | { kind: "author"; name: string };

/**
 * Phase 4 — Gallery.
 *
 * Header (Alex Brush title), horizontally scrollable filter chips
 * (All · Letters · Photos · Voice · per-contributor), and a
 * 2-column masonry grid of GalleryCards. Tapping a card opens the
 * full-screen GalleryCardView modal layered above.
 *
 * Sort: chronological, oldest first (matches the Story phase).
 */
export function GalleryScreen({
  recipientName,
  contributions,
  onReplay,
}: {
  recipientName: string;
  contributions: RevealContribution[];
  /** Optional replay handler. When provided, renders a subtle
   *  "Relive the opening" link near the gallery header that
   *  re-runs Phase 1 → Phase 2 → Phase 3. Session-only — does
   *  not reset recipientCompletedAt on the server. */
  onReplay?: () => void;
}) {
  const [filter, setFilter] = useState<Filter>({ kind: "all" });
  const [openId, setOpenId] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...contributions].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [contributions],
  );

  const contributors = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const c of sorted) {
      const name = c.authorName.trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      list.push(name);
    }
    return list;
  }, [sorted]);

  const counts = useMemo(() => {
    let letters = 0;
    let photos = 0;
    let audios = 0;
    let videos = 0;
    for (const c of sorted) {
      if (c.type === "TEXT") letters++;
      else if (c.type === "PHOTO") photos++;
      else if (c.type === "VOICE") audios++;
      else if (c.type === "VIDEO") videos++;
    }
    return { letters, photos, audios, videos };
  }, [sorted]);

  const filtered = useMemo(() => {
    if (filter.kind === "all") return sorted;
    if (filter.kind === "type") {
      return sorted.filter((c) => c.type === filter.type);
    }
    return sorted.filter((c) => c.authorName.trim() === filter.name);
  }, [filter, sorted]);

  const opened = openId ? sorted.find((c) => c.id === openId) ?? null : null;

  return (
    <main className="min-h-screen bg-cream pb-20">
      <header
        className="px-5"
        style={{
          paddingTop: "max(env(safe-area-inset-top), 56px)",
        }}
      >
        {onReplay && (
          <button
            type="button"
            onClick={onReplay}
            className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-amber/85 hover:text-amber-dark transition-colors"
          >
            <RotateCcw size={12} strokeWidth={2} aria-hidden="true" />
            Relive the opening
          </button>
        )}
        <h1 className="font-brush text-warm-slate text-[34px] leading-[1.1]">
          {recipientName ? `${recipientName}'s Capsule` : "Your Capsule"}
        </h1>
        <p className="mt-1 text-[13px] text-ink-mid">
          {sorted.length} {sorted.length === 1 ? "memory" : "memories"} from{" "}
          {contributors.length}{" "}
          {contributors.length === 1 ? "person" : "people"} who love you
        </p>
      </header>

      <FilterStrip
        filter={filter}
        onSelect={setFilter}
        contributors={contributors}
        counts={counts}
      />

      {filtered.length === 0 ? (
        <p className="mt-12 mx-5 text-center text-[14px] text-ink-mid italic">
          Nothing matches that filter.
        </p>
      ) : (
        <section className="mt-4 px-3 grid grid-cols-2 gap-3">
          {filtered.map((c) => (
            <GalleryCard
              key={c.id}
              contribution={c}
              onClick={() => setOpenId(c.id)}
            />
          ))}
        </section>
      )}

      {opened && (
        <GalleryCardView
          contribution={opened}
          onClose={() => setOpenId(null)}
        />
      )}
    </main>
  );
}

function FilterStrip({
  filter,
  onSelect,
  contributors,
  counts,
}: {
  filter: Filter;
  onSelect: (f: Filter) => void;
  contributors: string[];
  counts: { letters: number; photos: number; audios: number; videos: number };
}) {
  return (
    <div
      className="mt-5 -mx-5 px-5 overflow-x-auto"
      style={{
        WebkitOverflowScrolling: "touch",
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}
    >
      <style jsx>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Chip
          active={filter.kind === "all"}
          onClick={() => onSelect({ kind: "all" })}
        >
          All
        </Chip>
        {counts.letters > 0 && (
          <Chip
            active={filter.kind === "type" && filter.type === "TEXT"}
            onClick={() => onSelect({ kind: "type", type: "TEXT" })}
            icon={<Mail size={11} strokeWidth={2} aria-hidden="true" />}
          >
            Letters
          </Chip>
        )}
        {counts.audios > 0 && (
          <Chip
            active={filter.kind === "type" && filter.type === "VOICE"}
            onClick={() => onSelect({ kind: "type", type: "VOICE" })}
            icon={<Mic size={11} strokeWidth={2} aria-hidden="true" />}
          >
            Audio
          </Chip>
        )}
        {counts.photos > 0 && (
          <Chip
            active={filter.kind === "type" && filter.type === "PHOTO"}
            onClick={() => onSelect({ kind: "type", type: "PHOTO" })}
            icon={<ImageIcon size={11} strokeWidth={2} aria-hidden="true" />}
          >
            Photos
          </Chip>
        )}
        {counts.videos > 0 && (
          <Chip
            active={filter.kind === "type" && filter.type === "VIDEO"}
            onClick={() => onSelect({ kind: "type", type: "VIDEO" })}
            icon={<Video size={11} strokeWidth={2} aria-hidden="true" />}
          >
            Videos
          </Chip>
        )}
        {contributors.map((name) => (
          <Chip
            key={name}
            active={filter.kind === "author" && filter.name === name}
            onClick={() => onSelect({ kind: "author", name })}
          >
            From {name}
          </Chip>
        ))}
      </div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold tracking-[0.01em] border transition-colors ${
        active
          ? "bg-amber border-amber text-white"
          : "bg-transparent border-navy/15 text-ink-mid hover:border-navy/30"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
