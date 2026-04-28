"use client";

import { useState } from "react";

import {
  GiftCapsuleCreatingCard,
  type GiftCapsuleCreatingData,
} from "@/components/dashboard2/GiftCapsuleCreatingCard";

type Props = {
  capsules: GiftCapsuleCreatingData[];
  archived: GiftCapsuleCreatingData[];
};

const COLLAPSED_LIMIT = 3;

/**
 * Client wrapper around the "Gift Capsules You're Creating" list.
 *
 * Two views, toggled by a side-by-side pill row at the bottom:
 *   - Active (default) — the in-flight capsules. Shows the first
 *     three by default; "View all (N)" pill expands the list
 *     in-place to surface every capsule.
 *   - Archived — capsules the organiser has moved out of their
 *     main view. Once a capsule has been sent or saved by the
 *     recipient it can't be hard-deleted (the recipient depends
 *     on the row), so archive is the soft-hide replacement.
 *
 * Both pills use the same half-width amber-tint formatting so the
 * row reads as a paired toggle rather than primary + secondary.
 */
export function GiftCapsulesSection({ capsules, archived }: Props) {
  const [view, setView] = useState<"active" | "archived">("active");
  const [expanded, setExpanded] = useState(false);

  const list = view === "active" ? capsules : archived;
  const archivedCount = archived.length;
  const hiddenCount = Math.max(0, list.length - COLLAPSED_LIMIT);
  const canExpand = hiddenCount > 0;
  const visible =
    expanded || !canExpand ? list : list.slice(0, COLLAPSED_LIMIT);

  return (
    <div className="space-y-3">
      {visible.length === 0 ? (
        <div className="rounded-xl border border-navy/[0.06] bg-white/40 px-4 py-6 text-center text-[13px] text-ink-mid">
          {view === "archived"
            ? "No archived capsules yet."
            : "No gift capsules in flight."}
        </div>
      ) : (
        visible.map((c) => <GiftCapsuleCreatingCard key={c.id} capsule={c} />)
      )}

      <div className="flex items-stretch gap-2">
        {/* Pill 1 — view-all toggle for the currently selected
            list. Identical formatting to the Archived pill so the
            row reads as a paired toggle. */}
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

        {/* Pill 2 — Archived view toggle. Steady state is a quiet
            white pill with amber chrome so it doesn't compete
            with the primary 'View all' action; the moment the
            archived view is active it fills in to amber-tint to
            mirror View all's selected look. */}
        <button
          type="button"
          onClick={() => {
            setView((v) => (v === "active" ? "archived" : "active"));
            setExpanded(false);
          }}
          className={`flex-1 text-center rounded-xl border px-4 py-3 text-[13px] font-bold transition-colors ${
            view === "archived"
              ? "border-amber/40 bg-amber-tint text-amber hover:bg-amber-tint/80"
              : "border-amber/40 bg-white text-amber hover:bg-amber-tint/40"
          }`}
        >
          {view === "archived"
            ? "Back to active"
            : `Archived${archivedCount > 0 ? ` (${archivedCount})` : ""}`}
        </button>
      </div>
    </div>
  );
}
