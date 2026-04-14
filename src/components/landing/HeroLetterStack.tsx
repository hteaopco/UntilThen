"use client";

import { useCallback, useMemo, useRef, useState } from "react";

type Letter = {
  to: string;
  title: string;
  preview: string;
  lock: string;
  // Resting placement within the 460px-tall stack.
  top: number;
  left: number;
  width: number;
  // Gentle idle tilt so the stack reads as "a few letters tossed
  // on top of each other" rather than a neat pile.
  rotate: number;
};

const LETTERS: Letter[] = [
  {
    to: "To Ellie, age 18",
    title: "The night before your first day of school",
    preview:
      "You picked the backpack with tiny stars. I watched you pack it three times…",
    lock: "Unlocks Sept 2038",
    top: 0,
    left: 20,
    width: 300,
    rotate: -1.5,
  },
  {
    to: "For when you fall in love",
    title: "A voice note from Dad",
    preview: "🎙 2:34 · recorded on a rainy Sunday",
    lock: "Sealed",
    top: 130,
    left: 0,
    width: 280,
    rotate: 1.2,
  },
  {
    to: "Always",
    title: "The day we brought you home",
    preview: "📷 47 photos · with a letter",
    lock: "Sealed",
    top: 250,
    left: 50,
    width: 260,
    rotate: -0.8,
  },
];

const SWIPE_THRESHOLD = 90; // px — past this and the card flies away.
const EXIT_DISTANCE = 600; // px — how far the card flies when dismissed.
const EXIT_MS = 320;

/**
 * Swipeable stack of three white letter cards. The top card
 * follows the pointer, flies off past a threshold, and the stack
 * rotates so the next card becomes the front. After the third
 * swipe, the original order is restored so the loop never ends.
 */
export function HeroLetterStack() {
  // `order` indexes into LETTERS — index 0 is the top card.
  const [order, setOrder] = useState<number[]>(() =>
    LETTERS.map((_, i) => i),
  );
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const [exiting, setExiting] = useState<{ dir: 1 | -1 } | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const dismiss = useCallback((dir: 1 | -1) => {
    setExiting({ dir });
    // Wait for the exit animation to complete, then rotate the
    // stack so the next card is on top.
    window.setTimeout(() => {
      setExiting(null);
      setDrag(null);
      setOrder((prev) => {
        const [first, ...rest] = prev;
        if (first === undefined) return prev;
        return [...rest, first];
      });
    }, EXIT_MS);
  }, []);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (exiting) return;
    pointerIdRef.current = e.pointerId;
    startRef.current = { x: e.clientX, y: e.clientY };
    setDrag({ dx: 0, dy: 0 });
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== e.pointerId) return;
    if (!startRef.current) return;
    setDrag({
      dx: e.clientX - startRef.current.x,
      dy: e.clientY - startRef.current.y,
    });
  }

  function onPointerEnd(e: React.PointerEvent<HTMLDivElement>) {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    startRef.current = null;
    const dx = drag?.dx ?? 0;
    if (Math.abs(dx) > SWIPE_THRESHOLD) {
      dismiss(dx > 0 ? 1 : -1);
    } else {
      // Snap back.
      setDrag(null);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (exiting) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      dismiss(-1);
    } else if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
      e.preventDefault();
      dismiss(1);
    }
  }

  return (
    <div className="relative h-[460px] lg:h-[480px] w-full select-none">
      {order.map((letterIdx, stackPos) => {
        const letter = LETTERS[letterIdx];
        if (!letter) return null;
        const isTop = stackPos === 0;
        return (
          <LetterCard
            key={letterIdx}
            letter={letter}
            stackPos={stackPos}
            isTop={isTop}
            drag={isTop ? drag : null}
            exiting={isTop ? exiting : null}
            onPointerDown={isTop ? onPointerDown : undefined}
            onPointerMove={isTop ? onPointerMove : undefined}
            onPointerUp={isTop ? onPointerEnd : undefined}
            onPointerCancel={isTop ? onPointerEnd : undefined}
            onKeyDown={isTop ? onKeyDown : undefined}
          />
        );
      })}
      <p
        aria-hidden="true"
        className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.16em] font-bold text-ink-light/70"
      >
        Swipe ↔
      </p>
    </div>
  );
}

function LetterCard({
  letter,
  stackPos,
  isTop,
  drag,
  exiting,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onKeyDown,
}: {
  letter: Letter;
  stackPos: number;
  isTop: boolean;
  drag: { dx: number; dy: number } | null;
  exiting: { dir: 1 | -1 } | null;
  onPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onPointerCancel?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}) {
  const zIndex = 10 - stackPos;

  const { transform, opacity } = useMemo(() => {
    if (!isTop) {
      // Cards behind the top one sit slightly smaller + dimmer
      // so the depth of the stack reads at a glance.
      return {
        transform: `scale(${1 - stackPos * 0.04}) rotate(${letter.rotate}deg)`,
        opacity: 1 - stackPos * 0.12,
      };
    }
    if (exiting) {
      return {
        transform: `translate(${
          exiting.dir * EXIT_DISTANCE
        }px, -40px) rotate(${exiting.dir * 18}deg)`,
        opacity: 0,
      };
    }
    if (drag) {
      const rot = (drag.dx / 18).toFixed(2);
      return {
        transform: `translate(${drag.dx}px, ${drag.dy}px) rotate(${rot}deg)`,
        opacity: Math.max(0.4, 1 - Math.abs(drag.dx) / (SWIPE_THRESHOLD * 2)),
      };
    }
    return {
      transform: `rotate(${letter.rotate}deg)`,
      opacity: 1,
    };
  }, [drag, exiting, isTop, letter.rotate, stackPos]);

  const className = [
    "absolute rounded-2xl border border-navy/[0.08] px-[26px] py-6 bg-white",
    "outline-none focus-visible:ring-2 focus-visible:ring-amber/40",
    isTop ? "cursor-grab active:cursor-grabbing" : "pointer-events-none",
  ].join(" ");

  return (
    <div
      role={isTop ? "button" : undefined}
      aria-label={isTop ? `Dismiss letter: ${letter.title}` : undefined}
      tabIndex={isTop ? 0 : -1}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onKeyDown={onKeyDown}
      className={className}
      style={{
        width: letter.width,
        maxWidth: `calc(100% - ${letter.left}px)`,
        top: letter.top,
        left: letter.left,
        zIndex,
        boxShadow:
          "0 4px 24px rgba(15,31,61,0.08), 0 1px 4px rgba(15,31,61,0.04)",
        transform,
        transformOrigin: "center center",
        opacity,
        transition: drag
          ? "none"
          : `transform ${EXIT_MS}ms cubic-bezier(0.2,0.8,0.3,1), opacity ${EXIT_MS}ms ease`,
        touchAction: isTop ? "pan-y" : undefined,
      }}
    >
      <div className="text-[10px] uppercase tracking-[0.1em] text-amber font-bold mb-1.5">
        {letter.to}
      </div>
      <h3 className="text-sm font-bold text-navy leading-[1.3] mb-1.5">
        {letter.title}
      </h3>
      <p className="text-xs text-ink-light leading-[1.6]">{letter.preview}</p>
      <div className="mt-3.5 pt-3 border-t border-navy/[0.08] flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] font-bold text-gold">
        <span className="inline-block w-[5px] h-[5px] rounded-full bg-gold" />
        {letter.lock}
      </div>
    </div>
  );
}
