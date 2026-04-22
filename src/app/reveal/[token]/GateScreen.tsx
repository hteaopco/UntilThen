"use client";

import { useEffect, useState } from "react";

/**
 * Pre-entry gate. Universal one-tap screen shown before the
 * reveal proper. Its sole jobs:
 *
 *   1. Satisfy the browser audio-autoplay policy — the tap is
 *      the user gesture that unlocks the background music. By
 *      the time the Entry screen fades in, the soft-strings bed
 *      is already playing underneath.
 *   2. Give the recipient a single anticipatory beat before the
 *      reveal opens — a theater-curtain moment.
 *
 * Always shown (not just on iOS) so the experience is uniform
 * across devices. One extra tap is a negligible cost for
 * guaranteed audio-start alignment.
 */
export function GateScreen({ onEnter }: { onEnter: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    // Small delay so the gate itself fades in, avoiding a
    // hard cut when the client boots.
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <button
      type="button"
      onClick={onEnter}
      aria-label="Enter reveal"
      className="fixed inset-0 z-[270] flex items-center justify-center bg-cream w-full h-full text-center select-none cursor-pointer"
      style={{
        background:
          "radial-gradient(ellipse at 50% 50%, rgba(224, 154, 90, 0.12) 0%, transparent 60%), " +
          "linear-gradient(180deg, rgba(253, 243, 233, 1) 0%, rgba(253, 248, 242, 1) 100%)",
        paddingTop: "max(env(safe-area-inset-top), 24px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
      }}
    >
      <div
        className="flex flex-col items-center gap-4"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 700ms ease-out, transform 700ms ease-out",
        }}
      >
        <span
          aria-hidden="true"
          className="inline-flex h-12 w-12 rounded-full items-center justify-center"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, rgba(196,122,58,0.25) 0%, rgba(196,122,58,0) 70%)",
            animation: "gatePulse 2600ms ease-in-out infinite",
          }}
        >
          <span
            className="block h-2 w-2 rounded-full bg-amber"
            style={{ boxShadow: "0 0 0 0 rgba(196,122,58,0.35)" }}
          />
        </span>
        <p className="font-serif text-navy text-[20px] tracking-[-0.2px]">
          Tap to begin
        </p>
        <p className="text-[12px] text-ink-mid tracking-[0.08em]">
          Sound will play quietly in the background.
        </p>
      </div>

      <style jsx global>{`
        @keyframes gatePulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.9;
          }
          50% {
            transform: scale(1.15);
            opacity: 1;
          }
        }
      `}</style>
    </button>
  );
}
