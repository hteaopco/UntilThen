"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { Typewriter } from "@/components/ui/Typewriter";
import { triggerCelebration, triggerFireworks } from "@/lib/confetti";

type Contribution = {
  id: string;
  authorName: string;
  type: "TEXT" | "PHOTO" | "VOICE" | "VIDEO";
  title: string | null;
  body: string | null;
};

type Phase = "unlock" | "author-intro" | "fading-to-note" | "reading" | "fading-out" | "closing" | "done";

function authorAlreadySigned(body: string | null, authorName: string): boolean {
  if (!body) return false;
  const plain = body.replace(/<[^>]+>/g, " ").trim().toLowerCase();
  const name = authorName.toLowerCase();
  const lastChunk = plain.slice(-80);
  return lastChunk.includes(name) ||
    lastChunk.includes(`from ${name}`) ||
    lastChunk.includes(`love, ${name}`) ||
    lastChunk.includes(`love ${name}`) ||
    lastChunk.includes(`— ${name}`) ||
    lastChunk.includes(`- ${name}`);
}

export function SequentialRevealScreen({
  contributions,
  onComplete,
}: {
  contributions: Contribution[];
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("unlock");
  const [index, setIndex] = useState(0);
  const [maxSeen, setMaxSeen] = useState(0);

  const total = contributions.length;
  const current = contributions[index];

  // Unlock: 4 confetti pops + fireworks
  useEffect(() => {
    if (phase !== "unlock") return;
    const t1 = setTimeout(() => void triggerCelebration(), 600);
    const t2 = setTimeout(() => void triggerFireworks(), 1000);
    const t3 = setTimeout(() => void triggerCelebration(), 1800);
    const t4 = setTimeout(() => void triggerFireworks(), 2400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [phase]);

  if (!current && phase === "reading") {
    onComplete();
    return null;
  }

  // ── Phase 1: Unlock ────────────────────────────────────
  if (phase === "unlock") {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-[400px]">
          <div className="w-24 h-24 rounded-full bg-amber-tint flex items-center justify-center mx-auto mb-8 animate-pulse">
            <div className="w-16 h-16 rounded-full bg-amber/20 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-amber/30" />
            </div>
          </div>

          <h1 className="text-[22px] lg:text-[28px] font-extrabold text-navy tracking-[-0.5px] leading-[1.3]">
            <Typewriter
              text="Here's what they wrote for you."
              speed={55}
              startDelay={1200}
              onComplete={() => {
                setTimeout(() => setPhase("author-intro"), 2000);
              }}
            />
          </h1>
        </div>
      </main>
    );
  }

  // ── Closing ────────────────────────────────────────────
  if (phase === "closing") {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-[400px]">
          <h1 className="text-[22px] lg:text-[28px] font-extrabold text-navy tracking-[-0.5px] leading-[1.3]">
            <Typewriter
              text={`That was ${total} ${total === 1 ? "person" : "people"} who showed up for you.`}
              speed={55}
              startDelay={500}
              onComplete={() => {
                setTimeout(() => {
                  setPhase("done");
                  onComplete();
                }, 2000);
              }}
            />
          </h1>
        </div>
      </main>
    );
  }

  // ── Author intro ───────────────────────────────────────
  if (phase === "author-intro" && current) {
    return (
      <main className="min-h-screen bg-warm-surface flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[560px]">
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-ink-light mb-4 text-center">
            {index + 1} of {total}
          </div>

          <div
            className="rounded-2xl bg-[#fdfbf5] text-navy px-7 py-12 lg:px-9 lg:py-16 shadow-[0_12px_40px_-12px_rgba(196,122,58,0.15)] border border-amber/10 min-h-[300px] flex items-center justify-center"
            style={{ transform: "rotate(-0.3deg)" }}
          >
            <div className="text-center">
              <Typewriter
                text={`From ${current.authorName}.`}
                speed={50}
                startDelay={300}
                className="text-[18px] font-bold text-navy tracking-[-0.2px]"
                onComplete={() => {
                  setTimeout(() => setPhase("fading-to-note"), 750);
                }}
              />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // ── Fade from author intro to note ─────────────────────
  if (phase === "fading-to-note" && current) {
    return (
      <main className="min-h-screen bg-warm-surface flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[560px]">
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-ink-light mb-4 text-center">
            {index + 1} of {total}
          </div>

          <FadeTransition onDone={() => setPhase("reading")} current={current} />
        </div>
      </main>
    );
  }

  // ── Fading out current note ────────────────────────────
  if (phase === "fading-out") {
    return (
      <main className="min-h-screen bg-warm-surface flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-[560px]">
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-ink-light mb-4 text-center">
            {index + 1} of {total}
          </div>

          <div
            className="rounded-2xl bg-[#fdfbf5] text-navy px-7 py-8 lg:px-9 lg:py-10 shadow-[0_12px_40px_-12px_rgba(196,122,58,0.15)] border border-amber/10 transition-all duration-500 opacity-0 translate-y-4"
            style={{ transform: "rotate(-0.3deg)" }}
          />
        </div>
      </main>
    );
  }

  // ── Phase 2: Reading ───────────────────────────────────
  const canBack = index > 0;
  const isLast = index === total - 1;
  const showSignoff = current && !authorAlreadySigned(current.body, current.authorName);

  function goNext() {
    if (isLast) {
      void triggerCelebration();
      void triggerFireworks();
      setPhase("closing");
      return;
    }
    setPhase("fading-out");
    setTimeout(() => {
      const nextIndex = index + 1;
      setIndex(nextIndex);
      if (nextIndex > maxSeen) setMaxSeen(nextIndex);
      setPhase("author-intro");
    }, 500);
  }

  function goBack() {
    if (index > 0) {
      setPhase("fading-out");
      setTimeout(() => {
        setIndex(index - 1);
        setPhase("fading-to-note");
      }, 500);
    }
  }

  return (
    <main className="min-h-screen bg-warm-surface text-navy flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-[560px]">
        <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-ink-light mb-4 text-center">
          {index + 1} of {total}
        </div>

        <article
          className="rounded-2xl bg-[#fdfbf5] text-navy px-7 py-8 lg:px-9 lg:py-10 shadow-[0_12px_40px_-12px_rgba(196,122,58,0.15)] border border-amber/10 animate-fadeIn"
          style={{ transform: "rotate(-0.3deg)" }}
        >
          {current?.title && (
            <h2
              className="text-2xl lg:text-[28px] font-bold tracking-[-0.4px] leading-tight text-navy mb-4"
              style={{ fontFamily: "var(--font-caveat), 'Caveat', cursive" }}
            >
              {current.title}
            </h2>
          )}
          {current?.body ? (
            <div
              className="text-[18px] lg:text-[20px] leading-[1.8] text-navy/80"
              style={{ fontFamily: "var(--font-caveat), 'Caveat', cursive" }}
              dangerouslySetInnerHTML={{ __html: current.body }}
            />
          ) : (
            <p className="italic text-ink-light">
              (Non-text contribution — see the list after the reveal to view.)
            </p>
          )}

          {showSignoff && (
            <p
              className="text-right mt-6 text-[16px] text-navy/60 italic"
              style={{ fontFamily: "var(--font-caveat), 'Caveat', cursive" }}
            >
              — {current?.authorName}
            </p>
          )}
        </article>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={!canBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-mid hover:text-navy transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
            Back
          </button>
          <button
            type="button"
            onClick={goNext}
            className="inline-flex items-center gap-1.5 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
          >
            {isLast ? "See them all" : "Next"}
            <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>
    </main>
  );
}

function FadeTransition({ onDone, current }: { onDone: () => void; current: Contribution }) {
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    const t1 = setTimeout(() => setOpacity(0), 50);
    const t2 = setTimeout(() => onDone(), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div
      className="rounded-2xl bg-[#fdfbf5] text-navy px-7 py-12 lg:px-9 lg:py-16 shadow-[0_12px_40px_-12px_rgba(196,122,58,0.15)] border border-amber/10 min-h-[300px] flex items-center justify-center transition-opacity duration-500"
      style={{ transform: "rotate(-0.3deg)", opacity }}
    >
      <div className="text-center">
        <span className="text-[18px] font-bold text-navy tracking-[-0.2px]">
          From {current.authorName}.
        </span>
      </div>
    </div>
  );
}
