"use client";

import Image from "next/image";

export type TimeVaultState = "sealed" | "unlocking" | "open";

// Intrinsic width used for Next's image optimiser. Large enough that
// the generated srcset has sharp 2×/3× retina variants regardless of
// the CSS display size.
const INTRINSIC = 720;

/**
 * Time Vault — static PNG illustration wrapped in a 6s breathing
 * scale and a warm ambient bloom. The PNG at /public/time-vault2.png
 * is background-transparent and self-framing; no CSS clock elements.
 *
 * `state` is preserved for call-site compatibility. `sealed` drives
 * the breathing animation; future unlock choreography can layer on
 * top without touching the image.
 */
export function TimeVault({
  state = "sealed",
  size = 360,
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
          src="/time-vault2.png"
          alt=""
          width={INTRINSIC}
          height={INTRINSIC}
          quality={95}
          className="time-vault__img"
          priority
        />
      </div>
    </div>
  );
}
