"use client";

import { Pause, X } from "lucide-react";
import { useState } from "react";

/**
 * Cancel / pause subscription flow. UI only — real subscription
 * state lives in Square which isn't wired yet.
 */
export function BillingActions() {
  const [open, setOpen] = useState(false);

  return (
    <section className="pt-6 border-t border-navy/[0.06]">
      <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-red-600 mb-3">
        Danger zone
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-[1.5px] border-red-600 text-red-600 text-sm font-bold hover:bg-red-50 transition-colors"
        >
          <X size={16} strokeWidth={1.5} aria-hidden="true" />
          Cancel subscription
        </button>
      ) : (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-5 max-w-[560px]">
          <p className="text-sm text-red-800 font-semibold mb-2">
            Are you sure you want to cancel?
          </p>
          <p className="text-sm text-red-700/90 mb-4 leading-[1.6]">
            Your vault will enter read-only mode at the end of the current
            billing period. Entries are preserved for 12 months after
            cancellation. If you change your mind, you can resubscribe at any
            time and pick up exactly where you left off.
          </p>
          <p className="text-sm text-navy mb-4">
            Instead of cancelling, you can{" "}
            <strong>pause your subscription</strong> for up to 3 months.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                // TODO: Connect Square billing API — pause subscription.
                window.alert("Pause subscription — coming soon.");
                setOpen(false);
              }}
              className="inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
            >
              <Pause size={16} strokeWidth={1.5} aria-hidden="true" />
              Pause instead
            </button>
            <button
              type="button"
              onClick={() => {
                // TODO: Connect Square billing API — cancel subscription +
                // send confirmation email via Resend.
                window.alert("Cancel subscription — coming soon.");
                setOpen(false);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors"
            >
              <X size={16} strokeWidth={1.75} aria-hidden="true" />
              Cancel anyway
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm font-semibold text-ink-mid hover:text-navy px-2 py-2"
            >
              Never mind
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
