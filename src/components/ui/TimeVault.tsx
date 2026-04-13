"use client";

import type { CSSProperties } from "react";

export type TimeVaultState = "sealed" | "unlocking" | "open";

/**
 * Time Vault — the keepsake clock illustration that anchors the
 * parent dashboard, the child countdown view, and the reveal-day
 * preview. Renders purely with HTML + CSS (see globals.css for the
 * `.time-vault*` rules and keyframes) so it scales cleanly and
 * respects `prefers-reduced-motion`.
 *
 * The three states drive CSS animations via `data-state`:
 * - `sealed`    — gentle 6s breathing; idle state
 * - `unlocking` — 1.8s spin + press + glow rise
 * - `open`      — static open state with lifted glow
 */
export function TimeVault({
  state = "sealed",
  ariaLabel = "Time vault",
}: {
  state?: TimeVaultState;
  ariaLabel?: string;
}) {
  return (
    <div className="time-vault-stage" data-state={state}>
      <div className="time-vault-stage__bloom" />
      <div className="time-vault" data-state={state} aria-label={ariaLabel}>
        <div className="time-vault__glow" />

        <div className="time-vault__outer">
          {/* 60 tick marks — every 5th is a prominent gold hour
              mark, the rest are fine minute ticks. */}
          <div className="time-vault__tick-ring">
            {Array.from({ length: 60 }).map((_, i) => (
              <span
                key={i}
                className="time-vault__tick"
                style={{ "--i": i } as CSSProperties}
              />
            ))}
          </div>

          {/* Clock face */}
          <div className="time-vault__face">
            <div className="time-vault__rings" />

            <div className="time-vault__hands">
              <span className="time-vault__hand time-vault__hand--hour" />
              <span className="time-vault__hand time-vault__hand--minute" />
              <span className="time-vault__hand time-vault__hand--second" />
            </div>

            {/* Centre medallion + filled heart. */}
            <div className="time-vault__hub">
              <svg
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 21s-7.5-4.5-7.5-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7.5 3.5C19.5 16.5 12 21 12 21Z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
