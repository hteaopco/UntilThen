"use client";

import Image from "next/image";

export type TimeVaultState = "sealed" | "unlocking" | "open";

/**
 * Time Vault — a static, pre-background-stripped illustration wrapped
 * in a subtle 6s breathing scale while sealed. No ambient glow, no
 * CSS clock elements — the PNG at /public/time-vault2.png is the
 * illustration end-to-end.
 *
 * `state` is preserved for call-site compatibility. Only the
 * `sealed` state currently drives animation (breathing); any future
 * unlock choreography can layer on top without touching the image.
 */
export function TimeVault({
  state = "sealed",
  size = 280,
  ariaLabel = "Time vault",
}: {
  state?: TimeVaultState;
  size?: number;
  ariaLabel?: string;
}) {
  return (
    <div
      className="time-vault-stage"
      data-state={state}
      style={{ width: size, height: size }}
    >
      <div
        className="time-vault"
        data-state={state}
        role="img"
        aria-label={ariaLabel}
      >
        <Image
          src="/time-vault2.png"
          alt=""
          width={size}
          height={size}
          className="time-vault__img"
          priority
        />
      </div>
    </div>
  );
}
