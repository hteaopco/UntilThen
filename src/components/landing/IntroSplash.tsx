"use client";

import { useEffect, useState } from "react";

// Namespaced sessionStorage key. Used to suppress the splash
// on same-tab back-nav (e.g. "back to home" from /dashboard)
// while still letting it replay on an explicit reload — a hard
// refresh should always restore the intro beat.
const SESSION_KEY = "untilthen:intro-shown";

const TARGET = "untilThen.";
const UNTIL_LENGTH = 5; // "until"

// Timings
const BLINK_WAIT_MS = 1300; // initial cursor blink before typing starts
const CHAR_INTERVAL_MS = 110; // per-character typing cadence
const PAUSE_AFTER_PERIOD_MS = 720; // longer beat after typing "."
const PAUSE_AFTER_BACKSPACE_MS = 540; // pause to let the erasure land
const HOLD_AFTER_MS = 1700; // hold after comma lands before fading
const FADE_MS = 600;

type Phase =
  | "waiting"
  | "typing"
  | "pausingAfterPeriod"
  | "backspacing"
  | "pausingAfterBackspace"
  | "retyping"
  | "holding"
  | "fading"
  | "hidden";

function isReloadNavigation(): boolean {
  try {
    const entries = performance.getEntriesByType(
      "navigation",
    ) as PerformanceNavigationTiming[];
    return entries[0]?.type === "reload";
  } catch {
    return false;
  }
}

export function IntroSplash() {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("waiting");

  // Suppression rules:
  //   1. prefers-reduced-motion → skip.
  //   2. sessionStorage flag present + the navigation isn't a
  //      reload → skip. This covers back-nav from other routes
  //      inside the app without stealing the replay when the
  //      user hits refresh.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      setPhase("hidden");
      return;
    }
    let alreadyShown = false;
    try {
      alreadyShown = window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      /* private mode — fall through */
    }
    if (alreadyShown && !isReloadNavigation()) {
      setPhase("hidden");
    }
  }, []);

  // Stamp the session once we actually play (fade or hidden).
  // Subsequent back-nav in this tab will then skip unless the
  // user triggers a reload.
  useEffect(() => {
    if (phase !== "fading" && phase !== "hidden") return;
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "waiting") {
      const t = setTimeout(() => setPhase("typing"), BLINK_WAIT_MS);
      return () => clearTimeout(t);
    }
    if (phase === "typing") {
      if (text.length >= TARGET.length) {
        setPhase("pausingAfterPeriod");
        return;
      }
      const t = setTimeout(
        () => setText(TARGET.slice(0, text.length + 1)),
        CHAR_INTERVAL_MS,
      );
      return () => clearTimeout(t);
    }
    if (phase === "pausingAfterPeriod") {
      const t = setTimeout(() => setPhase("backspacing"), PAUSE_AFTER_PERIOD_MS);
      return () => clearTimeout(t);
    }
    if (phase === "backspacing") {
      const t = setTimeout(() => {
        setText((prev) => prev.slice(0, -1));
        setPhase("pausingAfterBackspace");
      }, CHAR_INTERVAL_MS);
      return () => clearTimeout(t);
    }
    if (phase === "pausingAfterBackspace") {
      const t = setTimeout(() => setPhase("retyping"), PAUSE_AFTER_BACKSPACE_MS);
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

  // Pull the comma out of the "then" span so we can render it in
  // bold Times New Roman — the serif shape makes it stand out against
  // the extra-bold DM Sans that everything else is set in.
  const endsWithComma = thenText.endsWith(",");
  const thenMain = endsWithComma ? thenText.slice(0, -1) : thenText;

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
        <span className="text-amber">{thenMain}</span>
        {endsWithComma && (
          <span
            className="text-amber"
            style={{
              fontFamily: "'Times New Roman', Times, serif",
              fontWeight: 700,
            }}
          >
            ,
          </span>
        )}
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
