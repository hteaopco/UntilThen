"use client";

import { ArrowLeft, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";

/**
 * Client-side action buttons for the entry detail page.
 *
 * Was a pair of Next <Link>s, but on iOS Safari the Edit link
 * sometimes failed to navigate — no URL change, no error surface.
 * Swapping to explicit router.push inside an onClick handler
 * gives us a reliable click → navigate path and keeps the server
 * component parent simple.
 */
export function EntryDetailActions({
  editHref,
  backHref,
}: {
  editHref: string | null;
  backHref: string;
}) {
  const router = useRouter();

  return (
    <div className="mt-12 flex items-center gap-4">
      {editHref && (
        <button
          type="button"
          onClick={() => router.push(editHref)}
          className="inline-flex items-center gap-2 rounded-lg bg-amber text-white px-5 py-2.5 text-[14px] font-bold hover:bg-amber-dark transition-colors"
        >
          <Pencil size={14} strokeWidth={2} aria-hidden="true" />
          Edit memory
        </button>
      )}
      <button
        type="button"
        onClick={() => router.push(backHref)}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-mid hover:text-navy transition-colors"
      >
        <ArrowLeft size={13} strokeWidth={2} aria-hidden="true" />
        Back
      </button>
    </div>
  );
}
