"use client";

import Image from "next/image";

export type TimeVaultState = "sealed" | "unlocking" | "open";

/**
 * Time Vault — a static illustration wrapped in a subtle breathing
 * animation and a warm ambient bloom. The clock face itself is the
 * imported image (/public/time-vault.png); no CSS clock elements
 * (bezel, hands, ticks, hub) are rendered here — the image is final.
 *
 * `state` is preserved for call-site compatibility and can drive
 * future wrapper-level effects if an "unlock" moment is added; the
 * illustration itself does not animate.
 */
export function TimeVault({
  state = "sealed",
  size = 290,
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
      <div className="time-vault-stage__bloom" />
      <div
        className="time-vault"
        data-state={state}
        role="img"
        aria-label={ariaLabel}
      >
        <Image
          src="/time-vault.png"
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
