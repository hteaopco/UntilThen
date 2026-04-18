"use client";

import { useEffect, useState } from "react";

export function Typewriter({
  text,
  speed = 65,
  startDelay = 300,
  cursorBlinks = 0,
  onComplete,
  className = "",
}: {
  text: string;
  speed?: number;
  startDelay?: number;
  cursorBlinks?: number;
  onComplete?: () => void;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const [cursorHidden, setCursorHidden] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), startDelay);
    return () => clearTimeout(t);
  }, [startDelay]);

  useEffect(() => {
    if (!started) return;
    if (displayed.length >= text.length) {
      setDone(true);
      onComplete?.();
      if (cursorBlinks > 0) {
        const t = setTimeout(() => setCursorHidden(true), cursorBlinks * 1100);
        return () => clearTimeout(t);
      } else {
        setCursorHidden(true);
      }
      return;
    }
    const t = setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + 1));
    }, speed);
    return () => clearTimeout(t);
  }, [started, displayed, text, speed, onComplete, cursorBlinks]);

  return (
    <span className={className}>
      {displayed}
      {started && !cursorHidden && <span className="animate-blink ml-[1px] inline-block w-[2px] h-[1em] bg-current align-text-bottom" />}
    </span>
  );
}
