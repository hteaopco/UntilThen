"use client";

import { ChevronRight, Search, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  GiftCapsuleCreatingCard,
  type GiftCapsuleCreatingData,
} from "@/components/dashboard2/GiftCapsuleCreatingCard";

type Props = {
  capsules: GiftCapsuleCreatingData[];
  archived: GiftCapsuleCreatingData[];
};

const COLLAPSED_LIMIT = 3;

const REVEAL_DATE_FMT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/**
 * Client wrapper around the "Gift Capsules You're Creating" list.
 *
 *   - Active list is always primary. The first three render
 *     inline; "View all (N)" expands the list in place.
 *   - Archived capsules live in a search-driven modal opened from
 *     the Archived pill, so the page never swaps between two
 *     parallel lists. Rows show only what the organiser needs to
 *     scan: title, contributor count, reveal date.
 *
 * Once a capsule has been sent or saved by the recipient it can't
 * be hard-deleted (the recipient depends on the row), so archive
 * is the soft-hide replacement.
 */
export function GiftCapsulesSection({ capsules, archived }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  const archivedCount = archived.length;
  const hiddenCount = Math.max(0, capsules.length - COLLAPSED_LIMIT);
  const canExpand = hiddenCount > 0;
  const visible =
    expanded || !canExpand ? capsules : capsules.slice(0, COLLAPSED_LIMIT);

  return (
    <div className="space-y-3">
      {visible.length === 0 ? (
        <div className="rounded-xl border border-navy/[0.06] bg-white/40 px-4 py-6 text-center text-[13px] text-ink-mid">
          No gift capsules in flight.
        </div>
      ) : (
        visible.map((c) => <GiftCapsuleCreatingCard key={c.id} capsule={c} />)
      )}

      <div className="flex items-stretch gap-2">
        {/* Pill 1 — view-all toggle for the active list. */}
        {canExpand ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex-1 text-center rounded-xl border border-amber/40 bg-amber-tint px-4 py-3 text-[13px] font-bold text-amber hover:bg-amber-tint/80 transition-colors"
          >
            {expanded ? "Show less" : `View all (${hiddenCount})`}
          </button>
        ) : (
          <div
            aria-disabled="true"
            className="flex-1 text-center rounded-xl border border-navy/8 bg-white/40 px-4 py-3 text-[13px] font-semibold text-ink-light/60 cursor-default select-none"
          >
            View all
          </div>
        )}

        {/* Pill 2 — opens the archived-capsule modal. Disabled
            (rendered as a quiet div) when there's nothing to
            archive yet, so the row keeps a balanced shape. */}
        {archivedCount > 0 ? (
          <button
            type="button"
            onClick={() => setArchiveOpen(true)}
            className="flex-1 text-center rounded-xl border border-amber/40 bg-white px-4 py-3 text-[13px] font-bold text-amber hover:bg-amber-tint/40 transition-colors"
          >
            Archived ({archivedCount})
          </button>
        ) : (
          <div
            aria-disabled="true"
            className="flex-1 text-center rounded-xl border border-navy/8 bg-white/40 px-4 py-3 text-[13px] font-semibold text-ink-light/60 cursor-default select-none"
          >
            Archived
          </div>
        )}
      </div>

      {archiveOpen && (
        <ArchivedModal
          capsules={archived}
          onClose={() => setArchiveOpen(false)}
        />
      )}
    </div>
  );
}

/**
 * Fullscreen-on-mobile / centred-card-on-desktop modal listing
 * every archived capsule, with a typeahead search box on top.
 * Sorted by revealDate descending (most recent reveal first), so
 * a returning organiser sees the capsules they're most likely
 * looking for at the top.
 */
function ArchivedModal({
  capsules,
  onClose,
}: {
  capsules: GiftCapsuleCreatingData[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");

  // Lock body scroll while the modal is open so the page behind
  // doesn't rubber-band on iOS when the user scrolls the list.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Esc-to-close. Mirrors what feels native on desktop and keeps
  // keyboard users out of trap-focus territory.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    const sorted = [...capsules].sort(
      (a, b) =>
        new Date(b.revealDate).getTime() - new Date(a.revealDate).getTime(),
    );
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((c) => {
      const inTitle = c.title.toLowerCase().includes(q);
      const inContribs = c.contributorNames.some((n) =>
        n.toLowerCase().includes(q),
      );
      return inTitle || inContribs;
    });
  }, [capsules, query]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Archived capsules"
      className="fixed inset-0 z-50 bg-navy/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[560px] max-h-[85vh] flex flex-col rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-5 pb-3 border-b border-navy/[0.06]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber">
              Archived
            </p>
            <h2 className="text-[18px] font-extrabold text-navy tracking-[-0.3px]">
              {capsules.length} capsule{capsules.length === 1 ? "" : "s"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-navy hover:bg-amber/15 border border-navy/10"
          >
            <X size={16} strokeWidth={2.25} aria-hidden="true" />
          </button>
        </header>

        <div className="px-5 sm:px-6 pt-3 pb-2">
          <label className="relative block">
            <span className="sr-only">Search archived capsules</span>
            <Search
              size={14}
              strokeWidth={2}
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-light"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or contributor"
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-navy/10 bg-warm-surface/40 text-[14px] text-navy placeholder:text-ink-light focus:outline-none focus:border-amber/40 focus:bg-white"
              autoFocus
            />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto px-3 sm:px-4 pb-4">
          {filtered.length === 0 ? (
            <div className="px-3 py-10 text-center text-[13px] text-ink-mid">
              {query
                ? "No archived capsules match that search."
                : "No archived capsules yet."}
            </div>
          ) : (
            <ul className="divide-y divide-navy/[0.05]">
              {filtered.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/capsules/${c.id}`}
                    prefetch={false}
                    onClick={onClose}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-amber/5 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-bold text-navy truncate leading-tight">
                        {c.title}
                      </p>
                      <p className="mt-0.5 text-[12px] text-ink-mid leading-tight">
                        {c.contributorCount}{" "}
                        {c.contributorCount === 1
                          ? "contributor"
                          : "contributors"}
                        <span className="mx-1.5 text-ink-light/60">·</span>
                        Reveal {REVEAL_DATE_FMT.format(new Date(c.revealDate))}
                      </p>
                    </div>
                    <ChevronRight
                      size={16}
                      strokeWidth={1.75}
                      className="shrink-0 text-ink-light"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
