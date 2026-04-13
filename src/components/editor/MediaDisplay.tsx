"use client";

import { useEffect, useMemo, useState } from "react";

export type MediaItem = {
  url: string;
  kind: "photo" | "voice" | "video";
};

type Tab = { kind: MediaItem["kind"]; label: string; icon: string };

const ALL_TABS: Tab[] = [
  { kind: "photo", label: "Photos", icon: "📷" },
  { kind: "video", label: "Video", icon: "🎥" },
  { kind: "voice", label: "Voice", icon: "🎙" },
];

export function MediaDisplay({ items }: { items: MediaItem[] }) {
  const grouped = useMemo(() => {
    return {
      photo: items.filter((i) => i.kind === "photo"),
      video: items.filter((i) => i.kind === "video"),
      voice: items.filter((i) => i.kind === "voice"),
    };
  }, [items]);

  const available = useMemo(
    () =>
      ALL_TABS.filter((t) => grouped[t.kind].length > 0),
    [grouped],
  );

  const [active, setActive] = useState<MediaItem["kind"] | null>(null);

  // Default to the first available tab whenever the list of available
  // tabs changes (e.g. items hydrate or a type is added).
  useEffect(() => {
    if (available.length === 0) {
      setActive(null);
      return;
    }
    if (!active || !available.some((t) => t.kind === active)) {
      setActive(available[0]!.kind);
    }
  }, [available, active]);

  if (available.length === 0) return null;

  const activeItems = active ? grouped[active] : [];

  return (
    <div className="mt-8">
      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {available.map((tab) => {
          const count = grouped[tab.kind].length;
          const isActive = tab.kind === active;
          return (
            <button
              key={tab.kind}
              type="button"
              onClick={() => setActive(tab.kind)}
              aria-pressed={isActive}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-bold tracking-[0.01em] transition-colors ${
                isActive
                  ? "bg-navy text-white"
                  : "bg-white border border-navy/15 text-ink-mid hover:border-navy hover:text-navy"
              }`}
            >
              <span aria-hidden="true">{tab.icon}</span>
              <span>{tab.label}</span>
              {count > 1 && (
                <span
                  className={`text-[11px] tabular-nums ${
                    isActive ? "text-white/70" : "text-ink-light"
                  }`}
                >
                  · {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active panel */}
      {active === "photo" && <PhotoGrid items={activeItems} />}
      {active === "video" && <VideoList items={activeItems} />}
      {active === "voice" && <VoiceList items={activeItems} />}
    </div>
  );
}

function PhotoGrid({ items }: { items: MediaItem[] }) {
  return (
    <div
      className={`grid gap-3 ${
        items.length === 1
          ? "grid-cols-1"
          : items.length === 2
            ? "grid-cols-2"
            : "grid-cols-2 sm:grid-cols-3"
      }`}
    >
      {items.map((p) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={p.url}
          src={p.url}
          alt=""
          className="w-full h-auto rounded-xl border border-navy/[0.06] shadow-sm"
        />
      ))}
    </div>
  );
}

function VideoList({ items }: { items: MediaItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((v) => (
        <video
          key={v.url}
          src={v.url}
          controls
          playsInline
          className="w-full rounded-xl border border-navy/[0.06] bg-black"
        />
      ))}
    </div>
  );
}

function VoiceList({ items }: { items: MediaItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((a) => (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio key={a.url} src={a.url} controls className="w-full" />
      ))}
    </div>
  );
}
