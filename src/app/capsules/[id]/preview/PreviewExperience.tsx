"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { captureEvent } from "@/components/PosthogProvider";
import { triggerCelebration } from "@/lib/confetti";
import { formatLong } from "@/lib/dateFormatters";

// ── Types ─────────────────────────────────────────────────────

type Occasion =
  | "BIRTHDAY"
  | "ANNIVERSARY"
  | "RETIREMENT"
  | "GRADUATION"
  | "WEDDING"
  | "OTHER";

export type PreviewContribution = {
  id: string;
  authorName: string;
  type: "TEXT" | "PHOTO" | "VOICE" | "VIDEO";
  title: string | null;
  body: string | null;
};

type Capsule = {
  id: string;
  title: string;
  recipientName: string;
  occasionType: Occasion;
  revealDate: string;
  isPaid: boolean;
  status: "DRAFT" | "ACTIVE" | "SEALED" | "REVEALED";
};

type Scene =
  | "gate"
  | "anticipation"
  | "celebration"
  | "contribution"
  | "pullforward"
  | "close";

// Up to 3 contributions are shown in preview — "leave mystery" per
// the brief. The rest are revealed only in the real recipient flow.
const PREVIEW_CONTRIBUTIONS_MAX = 3;

// ── Component ─────────────────────────────────────────────────

export function PreviewExperience({
  capsule,
  contributions,
}: {
  capsule: Capsule;
  contributions: PreviewContribution[];
}) {
  const router = useRouter();
  const [scene, setScene] = useState<Scene>("gate");
  const [contribIndex, setContribIndex] = useState(0);
  const [startedEvent, setStartedEvent] = useState(false);

  // Shown contributions — when we have none, we fall back to a
  // single placeholder card so scene 3 still has something warm.
  const visibleContributions = useMemo(() => {
    if (contributions.length > 0) {
      return contributions.slice(0, PREVIEW_CONTRIBUTIONS_MAX);
    }
    return [
      {
        id: "placeholder",
        authorName: "Your contributors",
        type: "TEXT" as const,
        title: null,
        body: "Your contributors' messages will appear here once they add them.",
      },
    ];
  }, [contributions]);

  // Scene-enter side effects: analytics + confetti.
  useEffect(() => {
    if (scene === "anticipation" && !startedEvent) {
      captureEvent("capsule_preview_started", { capsuleId: capsule.id });
      setStartedEvent(true);
    }
    if (scene === "celebration") {
      void triggerCelebration();
    }
    if (scene === "close") {
      captureEvent("capsule_preview_completed", { capsuleId: capsule.id });
    }
  }, [scene, capsule.id, startedEvent]);

  // Auto-advance from scene 5 (pullforward) after a short pause so
  // the user lands on the CTA without clicking.
  useEffect(() => {
    if (scene !== "pullforward") return;
    const t = window.setTimeout(() => setScene("close"), 2800);
    return () => window.clearTimeout(t);
  }, [scene]);

  function advanceContribution() {
    const next = contribIndex + 1;
    if (next >= visibleContributions.length) {
      setScene("pullforward");
    } else {
      setContribIndex(next);
    }
  }

  function backContribution() {
    if (contribIndex > 0) setContribIndex(contribIndex - 1);
  }

  // ── Scene renderers ─────────────────────────────────────────

  if (scene === "gate") {
    return (
      <EntryGate
        recipientName={capsule.recipientName}
        onStart={() => setScene("anticipation")}
      />
    );
  }

  if (scene === "anticipation") {
    return (
      <Anticipation
        capsule={capsule}
        contributionCount={contributions.length}
        onOpen={() => setScene("celebration")}
      />
    );
  }

  if (scene === "celebration") {
    return (
      <Celebration
        recipientName={capsule.recipientName}
        onContinue={() => setScene("contribution")}
      />
    );
  }

  if (scene === "contribution") {
    const contribution = visibleContributions[contribIndex]!;
    return (
      <ContributionScene
        contribution={contribution}
        index={contribIndex}
        total={Math.max(visibleContributions.length, contributions.length || 1)}
        onBack={contribIndex > 0 ? backContribution : null}
        onNext={advanceContribution}
      />
    );
  }

  if (scene === "pullforward") {
    return <PullForward />;
  }

  return (
    <CloseScene
      capsule={capsule}
      onConvert={() => {
        captureEvent("capsule_preview_converted", { capsuleId: capsule.id });
        router.push(`/capsules/${capsule.id}#activate`);
      }}
      onBack={() => router.push(`/capsules/${capsule.id}`)}
    />
  );
}

// ── Scene 0 — Entry gate ──────────────────────────────────────

function EntryGate({
  recipientName,
  onStart,
}: {
  recipientName: string;
  onStart: () => void;
}) {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 text-center"
      style={{
        backgroundColor: "#fdf8f2",
        backgroundImage: "linear-gradient(rgba(44,36,32,0.3), rgba(44,36,32,0.3))",
      }}
    >
      <div className="max-w-[520px] space-y-8">
        <div
          aria-hidden="true"
          className="text-4xl animate-pulse"
          style={{ animationDuration: "2.5s" }}
        >
          ✨
        </div>
        <p className="text-[22px] lg:text-[26px] font-extrabold text-navy tracking-[-0.4px] leading-[1.25]">
          This is what {recipientName} will experience.
        </p>
        <button
          type="button"
          onClick={onStart}
          className="inline-flex items-center gap-2 bg-amber text-white px-7 py-3.5 rounded-lg text-[15px] font-bold hover:bg-amber-dark transition-colors"
        >
          Start preview →
        </button>
      </div>
    </main>
  );
}

// ── Scene 1 — Anticipation ────────────────────────────────────

function Anticipation({
  capsule,
  contributionCount,
  onOpen,
}: {
  capsule: Capsule;
  contributionCount: number;
  onOpen: () => void;
}) {
  const line = headlineForOccasion(
    capsule.occasionType,
    capsule.recipientName,
    contributionCount,
  );
  return (
    <main className="min-h-screen bg-warm-slate text-white flex items-center justify-center px-6 animate-fadeIn">
      <div className="max-w-[520px] w-full text-center space-y-8">
        <div aria-hidden="true" className="text-4xl">
          ✨
        </div>
        <h1 className="text-balance text-[28px] lg:text-[36px] font-extrabold tracking-[-0.5px] leading-[1.15]">
          {line}
        </h1>
        <div className="text-[15px] text-white/75">
          <div className="font-semibold text-white">{capsule.title}</div>
          <div>{formatLong(capsule.revealDate)}</div>
        </div>
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center gap-2 bg-amber text-white px-7 py-3.5 rounded-lg text-[15px] font-bold hover:bg-amber-dark transition-colors"
        >
          Open your capsule →
        </button>
      </div>
    </main>
  );
}

// ── Scene 2 — Celebration ─────────────────────────────────────

function Celebration({
  recipientName,
  onContinue,
}: {
  recipientName: string;
  onContinue: () => void;
}) {
  // Auto-advance after the confetti drifts down. The brief calls
  // for ~3s before fading; we wait 3200ms then trigger Scene 3 on
  // the next user click (tap anywhere).
  useEffect(() => {
    const t = window.setTimeout(() => {
      // intentionally don't auto-advance — leave the moment on
      // screen until the user taps. (Auto-advance would cut the
      // emotional beat short on slower readers.)
    }, 3200);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <main
      className="min-h-screen bg-warm-slate text-white flex items-center justify-center px-6 cursor-pointer"
      onClick={onContinue}
      role="button"
      aria-label="Continue"
    >
      <div className="max-w-[520px] w-full text-center space-y-6">
        <div aria-hidden="true" className="text-5xl">
          🎉
        </div>
        <h1 className="text-balance text-[32px] lg:text-[44px] font-extrabold tracking-[-0.6px] leading-[1.1]">
          Happy Birthday, {recipientName}.
        </h1>
        <p className="text-[13px] italic text-white/50 pt-8">
          Tap anywhere to continue
        </p>
      </div>
    </main>
  );
}

// ── Scene 3/4 — Contribution ──────────────────────────────────

function ContributionScene({
  contribution,
  index,
  total,
  onBack,
  onNext,
}: {
  contribution: PreviewContribution;
  index: number;
  total: number;
  onBack: (() => void) | null;
  onNext: () => void;
}) {
  return (
    <main className="min-h-screen bg-warm-slate text-white flex flex-col px-6 py-10">
      <div className="max-w-[640px] w-full mx-auto flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <span className="text-[12px] uppercase tracking-[0.14em] font-bold text-white/55">
            {index + 1} of {total}
          </span>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                aria-hidden="true"
                className={`w-2 h-2 rounded-full ${
                  i === index
                    ? "bg-gold"
                    : i < index
                      ? "bg-white/45"
                      : "bg-white/15"
                }`}
              />
            ))}
          </div>
        </div>

        <article className="flex-1 flex flex-col justify-center">
          <div className="text-[12px] uppercase tracking-[0.14em] font-bold text-amber mb-3">
            From {contribution.authorName}
          </div>
          {contribution.title && (
            <h2 className="text-[26px] lg:text-[32px] font-extrabold text-white tracking-[-0.4px] leading-tight mb-4">
              {contribution.title}
            </h2>
          )}
          {contribution.body && (
            <div
              className="tiptap-editor text-[17px] leading-[1.9] text-white/90"
              style={{ color: "#2c2420" }}
            >
              <div
                className="rounded-2xl bg-[#fdfbf5] px-7 py-8 lg:px-9 lg:py-10 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.5)]"
                dangerouslySetInnerHTML={{ __html: contribution.body }}
              />
            </div>
          )}
        </article>

        <div className="mt-8 flex items-center justify-between">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="text-sm font-medium text-white/60 hover:text-white transition-colors"
            >
              ← Back
            </button>
          ) : (
            <span aria-hidden="true" />
          )}
          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center gap-2 bg-gold text-navy px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-gold-light transition-colors"
          >
            Next →
          </button>
        </div>
      </div>
    </main>
  );
}

// ── Scene 5 — Pull forward ────────────────────────────────────

function PullForward() {
  return (
    <main className="min-h-screen bg-warm-slate text-white flex items-center justify-center px-6 animate-fadeIn">
      <div className="max-w-[520px] text-center space-y-3">
        <p className="text-[22px] lg:text-[26px] font-semibold text-white tracking-[-0.3px] leading-[1.4]">
          There&rsquo;s more waiting for her.
        </p>
        <p className="text-[22px] lg:text-[26px] font-semibold text-white/85 leading-[1.4]">
          Messages. Photos. Voices.
        </p>
        <p className="text-[22px] lg:text-[26px] font-semibold text-white/75 leading-[1.4]">
          All from the people who love her.
        </p>
      </div>
    </main>
  );
}

// ── Scene 6 — Close the sale ──────────────────────────────────

function CloseScene({
  capsule,
  onConvert,
  onBack,
}: {
  capsule: Capsule;
  onConvert: () => void;
  onBack: () => void;
}) {
  const alreadyPaid =
    capsule.isPaid || capsule.status === "ACTIVE" || capsule.status === "SEALED";

  return (
    <main className="min-h-screen bg-warm-slate text-white flex items-center justify-center px-6 animate-fadeIn">
      <div className="max-w-[420px] w-full text-center space-y-5">
        <p className="text-[20px] font-bold text-white tracking-[-0.3px]">
          This is what you&rsquo;re sending.
        </p>
        {alreadyPaid ? (
          <>
            <p className="text-sm text-white/65 leading-[1.6]">
              Already unlocked — invites have gone to your contributors.
            </p>
            <button
              type="button"
              onClick={onBack}
              className="w-full max-w-[360px] mx-auto inline-flex items-center justify-center gap-2 bg-gold text-navy px-6 py-3 rounded-lg text-[15px] font-bold hover:bg-gold-light transition-colors"
            >
              Back to capsule →
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={onConvert}
              className="w-full max-w-[360px] mx-auto inline-flex items-center justify-center gap-2 bg-amber text-white px-6 py-3 rounded-lg text-[15px] font-bold hover:bg-amber-dark transition-colors"
            >
              Send to contributors — $9.99 →
            </button>
            <p className="text-xs text-white/60 leading-[1.55]">
              Invites your contributors. They&rsquo;ll add messages before the
              reveal date.
            </p>
            <p className="text-[15px] italic text-amber/90">
              They&rsquo;ll never expect this.
            </p>
          </>
        )}

        <div className="pt-6">
          <Link
            href={`/capsules/${capsule.id}`}
            className="text-xs font-medium text-white/45 hover:text-white/80 transition-colors"
          >
            Back to capsule
          </Link>
        </div>
      </div>
    </main>
  );
}

// ── Copy helpers ──────────────────────────────────────────────

function headlineForOccasion(
  occasion: Occasion,
  recipientName: string,
  count: number,
): string {
  // Safe default per brief: "N people left you something."
  // Personal-moment occasions use the warmer "showed up for" line;
  // professional/life-transition occasions fall back to "wrote to"
  // so the tone doesn't overreach.
  const n = count.toLocaleString();
  if (count === 0) {
    return `The capsule is ready for ${recipientName}.`;
  }
  const plural = count === 1;
  switch (occasion) {
    case "BIRTHDAY":
      return plural
        ? `One person showed up for ${recipientName}.`
        : `${n} people showed up for ${recipientName}.`;
    case "ANNIVERSARY":
    case "WEDDING":
      return plural
        ? `One person wrote to ${recipientName}.`
        : `${n} people wrote to ${recipientName}.`;
    case "RETIREMENT":
    case "GRADUATION":
      return plural
        ? `One person wrote to ${recipientName}.`
        : `${n} people wrote to ${recipientName}.`;
    case "OTHER":
    default:
      return plural
        ? `One person left ${recipientName} something.`
        : `${n} people left ${recipientName} something.`;
  }
}
