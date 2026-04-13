"use client";

import { useEffect, useState } from "react";

const TARGET = "untilThen.";
const UNTIL_LENGTH = 5; // "until"

// Timings
const BLINK_WAIT_MS = 2200; // ~2 cursor blinks before typing starts
const CHAR_INTERVAL_MS = 110;
const PAUSE_AFTER_PERIOD_MS = 280; // brief "wait, wrong punctuation" beat
const HOLD_AFTER_MS = 1100; // 1 full cursor blink cycle
const FADE_MS = 550;

type Phase =
  | "waiting"
  | "typing"
  | "pausing"
  | "backspacing"
  | "retyping"
  | "holding"
  | "fading"
  | "hidden";

export function IntroSplash() {
  const [text, setText] = useState("");
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
      if (text.length >= TARGET.length) {
        setPhase("pausing");
        return;
      }
      const t = setTimeout(
        () => setText(TARGET.slice(0, text.length + 1)),
        CHAR_INTERVAL_MS,
      );
      return () => clearTimeout(t);
    }
    if (phase === "pausing") {
      const t = setTimeout(() => setPhase("backspacing"), PAUSE_AFTER_PERIOD_MS);
      return () => clearTimeout(t);
    }
    if (phase === "backspacing") {
      const t = setTimeout(() => {
        setText((prev) => prev.slice(0, -1));
        setPhase("retyping");
      }, CHAR_INTERVAL_MS);
      return () => clearTimeout(t);
    }
    if (phase === "retyping") {
      const t = setTimeout(() => {
        setText((prev) => `${prev},`);
        setPhase("holding");
      }, CHAR_INTERVAL_MS);
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
  }, [phase, text.length]);

  if (phase === "hidden") return null;

  const untilLen = Math.min(text.length, UNTIL_LENGTH);
  const untilText = text.slice(0, untilLen);
  const thenText = text.slice(UNTIL_LENGTH);

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
