"use client";

import { useEffect, useState } from "react";

export function Typewriter({
  text,
  speed = 65,
  startDelay = 300,
  onComplete,
  className = "",
}: {
  text: string;
  speed?: number;
  startDelay?: number;
  onComplete?: () => void;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState("");
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), startDelay);
    return () => clearTimeout(t);
  }, [startDelay]);

  useEffect(() => {
    if (!started) return;
    if (displayed.length >= text.length) {
      setDone(true);
      onComplete?.();
      return;
    }
    const t = setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + 1));
    }, speed);
    return () => clearTimeout(t);
  }, [started, displayed, text, speed, onComplete]);

  return (
    <span className={className}>
      {displayed}
      {!done && <span className="animate-blink ml-[1px] inline-block w-[2px] h-[1em] bg-current align-text-bottom" />}
    </span>
  );
}
