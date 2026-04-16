"use client";

import { PlusCircle, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { AddChildModal } from "@/components/account/AddChildModal";

export function NewVaultButton({
  variant = "outline",
  label = "New Time Capsule",
  capsuleCount = 0,
}: {
  variant?: "outline" | "primary";
  label?: string;
  /** Current number of time capsules the user has. When >= 3,
      shows a subscription prompt before opening the creation modal. */
  capsuleCount?: number;
}) {
  const [open, setOpen] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const needsUpgrade = capsuleCount >= 3;

  function handleClick() {
    if (needsUpgrade) {
      setShowUpgrade(true);
    } else {
      setOpen(true);
    }
  }

  const className =
    variant === "primary"
      ? "mt-4 inline-flex items-center gap-2 bg-amber text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
      : "mt-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-amber/40 text-amber text-sm font-bold hover:bg-amber-tint transition-colors";

  return (
    <>
      <button type="button" onClick={handleClick} className={className}>
        <PlusCircle size={14} strokeWidth={1.75} aria-hidden="true" />
        {label}
      </button>

      {/* Subscription prompt for 3+ capsules */}
      {showUpgrade && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={() => setShowUpgrade(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.4)] w-full max-w-[420px]"
          >
            <div className="px-7 py-5 border-b border-navy/[0.08] flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-navy tracking-[-0.3px]">
                Add Time Capsule
              </h2>
              <button
                type="button"
                onClick={() => setShowUpgrade(false)}
                className="text-ink-mid hover:text-navy"
                aria-label="Close"
              >
                <X size={20} strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>
            <div className="px-7 py-6 space-y-4">
              <p className="text-sm text-ink-mid leading-[1.6]">
                Your plan includes <span className="font-semibold text-navy">3 time capsules</span>.
                Each additional capsule is{" "}
                <span className="font-semibold text-navy">$0.99/month</span>.
              </p>
              <div className="rounded-xl border border-navy/[0.08] bg-warm-surface/60 px-4 py-3 flex items-baseline justify-between">
                <span className="text-sm text-ink-mid">Additional Time Capsule</span>
                <span className="text-sm font-bold text-navy">$0.99/mo</span>
              </div>
              <p className="text-xs italic text-ink-light">
                No charge during the current beta.
              </p>
            </div>
            <div className="px-7 py-4 border-t border-navy/[0.08] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowUpgrade(false)}
                className="text-sm font-semibold text-ink-mid hover:text-navy px-3 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUpgrade(false);
                  setOpen(true);
                }}
                className="inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
              >
                Continue — Add Capsule
              </button>
            </div>
          </div>
        </div>
      )}

      {open && <AddChildModal onClose={() => setOpen(false)} />}
    </>
  );
}
