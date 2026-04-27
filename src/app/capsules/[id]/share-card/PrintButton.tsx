"use client";

import { Printer } from "lucide-react";

/**
 * Tiny client-only Print pill. Lives in its own component so the
 * parent page can stay a server component (and pull capsule data
 * server-side without a client roundtrip).
 *
 * Hidden in print output by the page's @media print rules so the
 * button itself doesn't end up on the printed card.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      aria-label="Print this card"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber text-white text-[12px] font-bold hover:bg-amber-dark transition-colors shadow-[0_2px_8px_rgba(196,122,58,0.25)]"
    >
      <Printer size={12} strokeWidth={2.25} aria-hidden="true" />
      Print
    </button>
  );
}
