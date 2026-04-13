"use client";

import { useMemo } from "react";

type DoorState = "idle" | "unlocking" | "open";

/**
 * A bank-style vault door rendered as pure SVG.
 *
 * - `idle` — the combination dial gently spins (40s/rev) so the
 *   object feels alive.
 * - `unlocking` — the dial spins fast (2 full turns, 1.2s) as if a
 *   combination is being entered.
 * - `open` — the whole door rotates open on the Y axis, hinged on
 *   its left edge. Content behind it becomes visible.
 */
export function VaultDoor({
  state = "idle",
  size = 220,
}: {
  state?: DoorState;
  size?: number;
}) {
  // 12 perimeter bolts on radius 96.
  const bolts = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
        return {
          x: 120 + 96 * Math.cos(angle),
          y: 120 + 96 * Math.sin(angle),
        };
      }),
    [],
  );

  // 24 tick marks around the combination dial.
  const ticks = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => {
        const angle = (i / 24) * Math.PI * 2;
        return {
          x1: 120 + 43 * Math.cos(angle),
          y1: 120 + 43 * Math.sin(angle),
          x2: 120 + 49 * Math.cos(angle),
          y2: 120 + 49 * Math.sin(angle),
        };
      }),
    [],
  );

  const dialClass =
    state === "unlocking"
      ? "animate-vaultSpin"
      : state === "open"
        ? ""
        : "animate-vaultIdle";

  return (
    <div
      className="inline-block"
      style={{ perspective: "900px" }}
      aria-hidden="true"
    >
      <div
        className="relative transition-transform ease-out"
        style={{
          transformOrigin: "left center",
          transform: state === "open" ? "rotateY(-68deg)" : "rotateY(0deg)",
          transitionDuration: "1200ms",
          willChange: "transform",
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 240 240"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: "block" }}
        >
          <defs>
            <radialGradient id="vaultDoorMetal" cx="30%" cy="30%" r="85%">
              <stop offset="0%" stopColor="#3a4d75" />
              <stop offset="55%" stopColor="#1e3560" />
              <stop offset="100%" stopColor="#0f1f3d" />
            </radialGradient>
            <radialGradient id="vaultDialMetal" cx="30%" cy="30%" r="85%">
              <stop offset="0%" stopColor="#4a5c80" />
              <stop offset="100%" stopColor="#1e3560" />
            </radialGradient>
            <radialGradient id="vaultBolt" cx="35%" cy="35%" r="75%">
              <stop offset="0%" stopColor="#e2c47a" />
              <stop offset="100%" stopColor="#8a6f2c" />
            </radialGradient>
          </defs>

          {/* Frame plate */}
          <circle
            cx="120"
            cy="120"
            r="118"
            fill="#e8eef5"
            stroke="#c7d0dd"
            strokeWidth="1"
          />
          {/* Inner rim */}
          <circle
            cx="120"
            cy="120"
            r="110"
            fill="none"
            stroke="#1e3560"
            strokeWidth="3"
          />
          {/* Door face */}
          <circle cx="120" cy="120" r="104" fill="url(#vaultDoorMetal)" />

          {/* Decorative concentric rings */}
          <circle
            cx="120"
            cy="120"
            r="88"
            fill="none"
            stroke="#c9a84c"
            strokeWidth="0.8"
            opacity="0.25"
          />
          <circle
            cx="120"
            cy="120"
            r="72"
            fill="none"
            stroke="#c9a84c"
            strokeWidth="0.5"
            opacity="0.18"
          />

          {/* Perimeter bolts */}
          {bolts.map((b, i) => (
            <g key={i}>
              <circle cx={b.x} cy={b.y} r="5" fill="url(#vaultBolt)" />
              <circle cx={b.x} cy={b.y} r="2" fill="#8a6f2c" />
            </g>
          ))}

          {/* Combination dial group — rotates on state change */}
          <g
            className={dialClass}
            style={{
              transformOrigin: "120px 120px",
              transformBox: "view-box",
            }}
          >
            <circle
              cx="120"
              cy="120"
              r="52"
              fill="url(#vaultDialMetal)"
              stroke="#c9a84c"
              strokeWidth="1.5"
            />
            {ticks.map((t, i) => (
              <line
                key={i}
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke="#c9a84c"
                strokeWidth="0.9"
                opacity="0.7"
              />
            ))}
            <circle
              cx="120"
              cy="120"
              r="42"
              fill="#0f1f3d"
              stroke="#c9a84c"
              strokeWidth="0.6"
            />
            {/* Cruciform handle */}
            <line
              x1="120"
              y1="86"
              x2="120"
              y2="154"
              stroke="#c9a84c"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <line
              x1="86"
              y1="120"
              x2="154"
              y2="120"
              stroke="#c9a84c"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Central hub */}
            <circle
              cx="120"
              cy="120"
              r="9"
              fill="#1e3560"
              stroke="#c9a84c"
              strokeWidth="1.5"
            />
          </g>

          {/* Gold heart at the very center — brand tie-in, doesn't rotate */}
          <path
            d="M 114.5 119 C 114.5 115.5, 117.5 114, 120 116 C 122.5 114, 125.5 115.5, 125.5 119 C 125.5 123, 120 127, 120 127 C 120 127, 114.5 123, 114.5 119 Z"
            fill="#c9a84c"
          />
        </svg>
      </div>
    </div>
  );
}
