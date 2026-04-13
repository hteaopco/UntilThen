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
          {/* 24 clock-face tick marks */}
          <div className="time-vault__tick-ring">
            {Array.from({ length: 24 }).map((_, i) => (
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

            {/* Centre hub + heart */}
            <div className="time-vault__hub">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M12 20s-6.5-3.9-6.5-9A4 4 0 0 1 12 8a4 4 0 0 1 6.5 3c0 5.1-6.5 9-6.5 9Z" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
