"use client";

import { useEffect, useState } from "react";

const TEXT = "untilThen.";
const UNTIL_LENGTH = 5; // "until"

// Timings
const BLINK_WAIT_MS = 2200; // ~2 full blink cycles before typing starts
const CHAR_INTERVAL_MS = 110;
const PAUSE_BEFORE_HOLD_MS = 200;
const HOLD_AFTER_MS = 700;
const FADE_MS = 550;

type Phase = "waiting" | "typing" | "holding" | "fading" | "hidden";

export function IntroSplash() {
  const [typed, setTyped] = useState(0);
  const [phase, setPhase] = useState<Phase>("waiting");

  // Respect reduced motion — skip the whole intro.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) setPhase("hidden");
  }, []);

  useEffect(() => {
    if (phase === "waiting") {
      const t = setTimeout(() => setPhase("typing"), BLINK_WAIT_MS);
      return () => clearTimeout(t);
    }
    if (phase === "typing") {
      if (typed >= TEXT.length) {
        const t = setTimeout(() => setPhase("holding"), PAUSE_BEFORE_HOLD_MS);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setTyped((c) => c + 1), CHAR_INTERVAL_MS);
      return () => clearTimeout(t);
    }
    if (phase === "holding") {
      const t = setTimeout(() => setPhase("fading"), HOLD_AFTER_MS);
      return () => clearTimeout(t);
    }
    if (phase === "fading") {
      const t = setTimeout(() => setPhase("hidden"), FADE_MS);
      return () => clearTimeout(t);
    }
  }, [phase, typed]);

  if (phase === "hidden") return null;

  const untilTyped = Math.min(typed, UNTIL_LENGTH);
  const thenTyped = Math.max(0, typed - UNTIL_LENGTH);
  const untilText = TEXT.slice(0, untilTyped);
  const thenText = TEXT.slice(UNTIL_LENGTH, UNTIL_LENGTH + thenTyped);

  // Cursor visible during waiting, typing, and holding.
  const showCursor = phase !== "fading";

  return (
    <div
      className={`fixed inset-0 z-[200] bg-white flex items-center justify-center transition-opacity ease-out ${
        phase === "fading" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      aria-hidden={phase === "fading"}
      role="presentation"
    >
      <div className="flex items-baseline text-[clamp(56px,10vw,112px)] font-extrabold tracking-[-0.035em] leading-none">
        {/* Zero-width space anchors the baseline while text is still empty */}
        <span aria-hidden="true">&#8203;</span>
        <span className="text-navy">{untilText}</span>
        <span className="text-sky">{thenText}</span>
        {showCursor && (
          <span
            aria-hidden="true"
            className="inline-block bg-navy animate-blink ml-[0.03em]"
            style={{ width: "0.055em", height: "0.88em" }}
          />
        )}
      </div>
    </div>
  );
}
