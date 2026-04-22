"use client";

import {
  Image as ImageIcon,
  LayoutGrid,
  List,
  Mail,
  Mic,
  RotateCcw,
  Search,
  Video,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { useRevealAnalytics } from "./analytics";
import { GalleryCard } from "./GalleryCard";
import { GalleryCardView } from "./GalleryCardView";
import { GalleryListView } from "./GalleryListView";
import type { RevealContribution } from "./RevealClient";

type TypeFilter = "all" | "TEXT" | "PHOTO" | "VOICE" | "VIDEO";
type View = "grid" | "list";

/**
 * Phase 4 — Gallery.
 *
 * Header (Alex Brush title) + replay link, search bar, primary
 * type pills, a secondary filter row (contributors + collections
 * when present), a grid/list view toggle, and either a 2-column
 * uniform grid or a single-column list of every contribution.
 *
 * Filter state is orthogonal — search + type + author +
 * collection can all be active simultaneously. Clearing any one
 * chip drops just that axis.
 *
 * Sort: chronological oldest first (matches the Story phase).
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
   *  re-runs Phase 1 → Phase 2 → Phase 3. Session-only. */
  onReplay?: () => void;
}) {
  const { capture } = useRevealAnalytics();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [authorFilter, setAuthorFilter] = useState<string | null>(null);
  const [collectionFilter, setCollectionFilter] = useState<string | null>(null);
  const [view, setView] = useState<View>("grid");
  const [openId, setOpenId] = useState<string | null>(null);

  // One view event per gallery mount. The phase-level analytics
  // elsewhere guarantee this doesn't double-fire within a session
  // since React remounts on phase change.
  useEffect(() => {
    capture("reveal_gallery_viewed", {
      contributionCount: contributions.length,
    });
    // We explicitly only want to fire once per mount, not every
    // time `contributions` identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const collections = useMemo(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const c of sorted) {
      const title = c.collectionTitle?.trim();
      if (!title || seen.has(title)) continue;
      seen.add(title);
      list.push(title);
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
    const q = searchQuery.trim().toLowerCase();
    return sorted.filter((c) => {
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (authorFilter && c.authorName.trim() !== authorFilter) return false;
      if (
        collectionFilter &&
        c.collectionTitle?.trim() !== collectionFilter
      ) {
        return false;
      }
      if (q) {
        const hay = [
          c.authorName,
          c.title ?? "",
          c.body ? c.body.replace(/<[^>]+>/g, " ") : "",
          new Date(c.createdAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
          c.collectionTitle ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sorted, searchQuery, typeFilter, authorFilter, collectionFilter]);

  const hasActiveFilter =
    searchQuery.trim().length > 0 ||
    typeFilter !== "all" ||
    authorFilter !== null ||
    collectionFilter !== null;

  function clearFilters() {
    capture("reveal_gallery_filters_cleared");
    setSearchQuery("");
    setTypeFilter("all");
    setAuthorFilter(null);
    setCollectionFilter(null);
  }

  // Debounced search event — fires 1s after the user stops typing
  // so we don't spam PostHog with per-keystroke events.
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) return;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      capture("reveal_gallery_searched", {
        queryLength: query.length,
        resultCount: filtered.length,
      });
    }, 1000);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery, capture, filtered.length]);

  function openCard(id: string) {
    const c = sorted.find((x) => x.id === id);
    if (!c) return;
    capture("reveal_gallery_card_opened", {
      contributionId: id,
      type: c.type,
      source: view,
    });
    setOpenId(id);
  }

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
            onClick={() => {
              capture("reveal_replay_clicked");
              onReplay();
            }}
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

      {/* Search + view toggle row */}
      <div className="mt-5 px-5 flex items-center gap-2">
        <label className="flex-1 relative block">
          <span className="sr-only">Search memories</span>
          <Search
            size={14}
            strokeWidth={2}
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-light pointer-events-none"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search people, words, dates…"
            className="w-full bg-white border border-navy/10 rounded-full pl-9 pr-9 py-2 text-[13px] text-navy placeholder-ink-light focus:outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-ink-mid hover:text-navy hover:bg-navy/[0.04] flex items-center justify-center transition-colors"
            >
              <X size={12} strokeWidth={2} />
            </button>
          )}
        </label>

        <div
          role="group"
          aria-label="View mode"
          className="flex items-center gap-0.5 bg-white border border-navy/10 rounded-full p-0.5 shrink-0"
        >
          <ViewToggle
            active={view === "grid"}
            onClick={() => {
              if (view !== "grid") {
                capture("reveal_gallery_view_toggled", { view: "grid" });
              }
              setView("grid");
            }}
            label="Grid view"
          >
            <LayoutGrid size={14} strokeWidth={2} />
          </ViewToggle>
          <ViewToggle
            active={view === "list"}
            onClick={() => {
              if (view !== "list") {
                capture("reveal_gallery_view_toggled", { view: "list" });
              }
              setView("list");
            }}
            label="List view"
          >
            <List size={14} strokeWidth={2} />
          </ViewToggle>
        </div>
      </div>

      {/* Primary type pills */}
      <div
        className="mt-4 -mx-5 px-5 overflow-x-auto no-scrollbar"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex items-center gap-2 whitespace-nowrap">
          <Chip
            active={typeFilter === "all"}
            onClick={() => {
              if (typeFilter !== "all") {
                capture("reveal_gallery_filtered", {
                  axis: "type",
                  value: "all",
                });
              }
              setTypeFilter("all");
            }}
          >
            All
          </Chip>
          {counts.letters > 0 && (
            <Chip
              active={typeFilter === "TEXT"}
              onClick={() => {
                capture("reveal_gallery_filtered", {
                  axis: "type",
                  value: "TEXT",
                });
                setTypeFilter("TEXT");
              }}
              icon={<Mail size={11} strokeWidth={2} aria-hidden="true" />}
            >
              Letters
            </Chip>
          )}
          {counts.audios > 0 && (
            <Chip
              active={typeFilter === "VOICE"}
              onClick={() => {
                capture("reveal_gallery_filtered", {
                  axis: "type",
                  value: "VOICE",
                });
                setTypeFilter("VOICE");
              }}
              icon={<Mic size={11} strokeWidth={2} aria-hidden="true" />}
            >
              Audio
            </Chip>
          )}
          {counts.photos > 0 && (
            <Chip
              active={typeFilter === "PHOTO"}
              onClick={() => {
                capture("reveal_gallery_filtered", {
                  axis: "type",
                  value: "PHOTO",
                });
                setTypeFilter("PHOTO");
              }}
              icon={<ImageIcon size={11} strokeWidth={2} aria-hidden="true" />}
            >
              Photos
            </Chip>
          )}
          {counts.videos > 0 && (
            <Chip
              active={typeFilter === "VIDEO"}
              onClick={() => {
                capture("reveal_gallery_filtered", {
                  axis: "type",
                  value: "VIDEO",
                });
                setTypeFilter("VIDEO");
              }}
              icon={<Video size={11} strokeWidth={2} aria-hidden="true" />}
            >
              Videos
            </Chip>
          )}
        </div>
      </div>

      {/* Filter section — people + collections when present */}
      {(contributors.length > 0 || collections.length > 0) && (
        <section className="mt-4 px-5">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] uppercase tracking-[0.14em] font-bold text-ink-light">
              Filter
            </span>
            {hasActiveFilter && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-[11px] font-semibold text-amber hover:text-amber-dark transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {contributors.length > 0 && (
            <FilterRow label="From">
              {contributors.map((name) => (
                <SmallChip
                  key={name}
                  active={authorFilter === name}
                  onClick={() => {
                    const next = authorFilter === name ? null : name;
                    capture("reveal_gallery_filtered", {
                      axis: "author",
                      value: next ?? "cleared",
                    });
                    setAuthorFilter(next);
                  }}
                >
                  {name}
                </SmallChip>
              ))}
            </FilterRow>
          )}

          {collections.length > 0 && (
            <FilterRow label="Collection">
              {collections.map((title) => (
                <SmallChip
                  key={title}
                  active={collectionFilter === title}
                  onClick={() => {
                    const next = collectionFilter === title ? null : title;
                    capture("reveal_gallery_filtered", {
                      axis: "collection",
                      value: next ?? "cleared",
                    });
                    setCollectionFilter(next);
                  }}
                >
                  {title}
                </SmallChip>
              ))}
            </FilterRow>
          )}
        </section>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="mt-12 mx-5 text-center text-[14px] text-ink-mid italic">
          Nothing matches those filters.
        </p>
      ) : view === "grid" ? (
        <section className="mt-5 px-3 grid grid-cols-2 gap-3">
          {filtered.map((c) => (
            <GalleryCard
              key={c.id}
              contribution={c}
              onClick={() => openCard(c.id)}
            />
          ))}
        </section>
      ) : (
        <section className="mt-5 px-3">
          <GalleryListView contributions={filtered} onOpen={openCard} />
        </section>
      )}

      {opened && (
        <GalleryCardView
          contribution={opened}
          onClose={() => setOpenId(null)}
        />
      )}

      {/* Hide native scrollbars on the horizontal-scrolling pill
          strips without losing touch-scroll. */}
      <style jsx global>{`
        .no-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </main>
  );
}

function ViewToggle({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
        active
          ? "bg-amber text-white"
          : "text-ink-mid hover:text-navy hover:bg-amber-tint"
      }`}
    >
      {children}
    </button>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 -mx-5 px-5 overflow-x-auto no-scrollbar mb-2" style={{ WebkitOverflowScrolling: "touch" }}>
      <span className="shrink-0 text-[10px] uppercase tracking-[0.12em] font-bold text-ink-mid">
        {label}
      </span>
      <div className="flex items-center gap-1.5 whitespace-nowrap">
        {children}
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

function SmallChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-[0.01em] border transition-colors ${
        active
          ? "bg-navy border-navy text-white"
          : "bg-white border-navy/15 text-ink-mid hover:border-navy/30"
      }`}
    >
      {children}
    </button>
  );
}
