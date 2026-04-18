"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

import { Typewriter } from "@/components/ui/Typewriter";
import { triggerCelebration } from "@/lib/confetti";

type Contribution = {
  id: string;
  authorName: string;
  type: "TEXT" | "PHOTO" | "VOICE" | "VIDEO";
  title: string | null;
  body: string | null;
};

type Phase = "unlock" | "reading" | "closing" | "done";

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
  const [letterVisible, setLetterVisible] = useState(false);
  const [authorDone, setAuthorDone] = useState(false);

  const total = contributions.length;
  const current = contributions[index];

  // Unlock phase: vault animation → confetti → typewriter → fade to first letter
  useEffect(() => {
    if (phase !== "unlock") return;
    const t1 = setTimeout(() => void triggerCelebration(), 800);
    const t2 = setTimeout(() => void triggerCelebration(), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [phase]);

  // When moving to a new letter, reset the fade-in
  useEffect(() => {
    if (phase !== "reading") return;
    setLetterVisible(false);
    setAuthorDone(false);
    const t = setTimeout(() => setLetterVisible(true), 100);
    return () => clearTimeout(t);
  }, [index, phase]);

  if (!current && phase === "reading") {
    onComplete();
    return null;
  }

  // ── Phase 1: Unlock transition ─────────────────────────
  if (phase === "unlock") {
    return (
      <main className="min-h-screen bg-navy flex flex-col items-center justify-center px-6 transition-colors duration-1000">
        <div className="text-center max-w-[400px]">
          {/* Vault glow animation */}
          <div className="w-24 h-24 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-8 animate-pulse">
            <div className="w-16 h-16 rounded-full bg-gold/30 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-gold/50" />
            </div>
          </div>

          <h1 className="text-[22px] lg:text-[28px] font-extrabold text-white tracking-[-0.5px] leading-[1.3]">
            <Typewriter
              text="Here's what they wrote for you."
              speed={55}
              startDelay={1200}
              onComplete={() => {
                setTimeout(() => setPhase("reading"), 2000);
              }}
            />
          </h1>
        </div>
      </main>
    );
  }

  // ── Phase 3: Closing transition ────────────────────────
  if (phase === "closing") {
    return (
      <main className="min-h-screen bg-navy flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-[400px]">
          <h1 className="text-[22px] lg:text-[28px] font-extrabold text-white tracking-[-0.5px] leading-[1.3]">
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

  // ── Phase 2: Reading letters ───────────────────────────
  const canBack = index > 0;
  const isLast = index === total - 1;

  function next() {
    if (isLast) {
      void triggerCelebration();
      setPhase("closing");
      return;
    }
    const nextIndex = index + 1;
    setIndex(nextIndex);
    if (nextIndex > maxSeen) setMaxSeen(nextIndex);
  }

  function back() {
    if (index > 0) setIndex(index - 1);
  }

  return (
    <main className="min-h-screen bg-warm-slate text-white flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-[560px]">
        <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-white/55 mb-4 text-center">
          {index + 1} of {total}
        </div>

        <article
          className="rounded-2xl bg-[#fdfbf5] text-navy px-7 py-8 lg:px-9 lg:py-10 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)] transition-all duration-500"
          style={{
            opacity: letterVisible ? 1 : 0,
            transform: letterVisible ? "translateY(0)" : "translateY(20px)",
          }}
        >
          <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-3">
            {letterVisible && (
              <Typewriter
                text={`From ${current?.authorName ?? ""}`}
                speed={40}
                startDelay={200}
                onComplete={() => setAuthorDone(true)}
              />
            )}
          </div>

          <div
            className="transition-opacity duration-700"
            style={{ opacity: authorDone ? 1 : 0 }}
          >
            {current?.title && (
              <h2 className="text-2xl lg:text-[28px] font-extrabold tracking-[-0.4px] leading-tight text-navy mb-4">
                {current.title}
              </h2>
            )}
            {current?.body ? (
              <div
                className="tiptap-editor text-[16px] leading-[1.75] text-ink-mid"
                dangerouslySetInnerHTML={{ __html: current.body }}
              />
            ) : (
              <p className="italic text-ink-light">
                (Non-text contribution — see the list after the reveal to view.)
              </p>
            )}
          </div>
        </article>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={back}
            disabled={!canBack}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
            Back
          </button>
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-1.5 bg-gold text-navy px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-gold-light transition-colors"
          >
            {isLast ? "See them all" : "Next"}
            <ArrowRight size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      </div>
    </main>
  );
}
