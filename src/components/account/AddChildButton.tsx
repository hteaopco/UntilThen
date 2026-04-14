"use client";

import { Plus } from "lucide-react";
import { useState } from "react";

import { AddChildModal } from "@/components/account/AddChildModal";

/**
 * Thin client wrapper so the server-rendered children list can stay
 * server-only — this button + modal pair handles the interactive
 * create flow.
 */
export function AddChildButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-left rounded-2xl border-2 border-dashed border-navy/15 bg-warm-surface px-5 py-5 hover:border-amber/40 hover:bg-amber-tint/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="shrink-0 w-11 h-11 rounded-full bg-white border border-amber/30 text-amber flex items-center justify-center"
          >
            <Plus size={18} strokeWidth={1.75} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-navy">Add another child</div>
            <div className="text-sm text-ink-mid mt-0.5">
              Create a new vault for another child. Invite contributors and
              start writing in minutes.
            </div>
          </div>
        </div>
      </button>
      {open && <AddChildModal onClose={() => setOpen(false)} />}
    </>
  );
}
