"use client";

import { useState } from "react";

import {
  GiftCapsuleCreatingCard,
  type GiftCapsuleCreatingData,
} from "@/components/dashboard2/GiftCapsuleCreatingCard";

type Props = {
  capsules: GiftCapsuleCreatingData[];
};

const COLLAPSED_LIMIT = 3;

/**
 * Client wrapper around the "Gift Capsules You're Creating" list.
 * Renders the first three rows by default; clicking "View all (N)"
 * expands the list in-place to show every capsule. No navigation —
 * the user stays on the dashboard.
 *
 * When the total is already ≤ COLLAPSED_LIMIT, the footer button is
 * rendered in a non-interactive greyed state so the layout stays
 * consistent across rows.
 */
export function GiftCapsulesSection({ capsules }: Props) {
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = Math.max(0, capsules.length - COLLAPSED_LIMIT);
  const canExpand = hiddenCount > 0;
  const visible =
    expanded || !canExpand ? capsules : capsules.slice(0, COLLAPSED_LIMIT);

  return (
    <div className="space-y-3">
      {visible.map((c) => (
        <GiftCapsuleCreatingCard key={c.id} capsule={c} />
      ))}

      {canExpand ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="block w-full text-center rounded-xl border border-amber/40 bg-amber-tint px-4 py-3 text-[13px] font-bold text-amber hover:bg-amber-tint/80 transition-colors"
        >
          {expanded ? "Show less" : `View all (${hiddenCount})`}
        </button>
      ) : (
        <div
          aria-disabled="true"
          className="w-full text-center rounded-xl border border-navy/8 bg-white/40 px-4 py-3 text-[13px] font-semibold text-ink-light/60 cursor-default select-none"
        >
          View all
        </div>
      )}
    </div>
  );
}
