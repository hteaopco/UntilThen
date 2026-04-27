"use client";

import { Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  buildMockCapsuleContributions,
  mockRevealCapsuleBirthday,
} from "@/app/reveal/[token]/mockData";
import {
  RevealExperience,
  type RevealCapsule,
  type RevealContribution,
} from "@/app/reveal/[token]/RevealExperience";
import type { StockVoiceUrls } from "@/lib/elevenlabs";

type Mode = "real" | "demo";

/**
 * Organiser-facing preview wrapper.
 *
 * Renders the full reveal via RevealExperience (same component
 * the actual recipient sees at /reveal/[token]), with a toggle
 * between two data sources:
 *
 *   - "This capsule" — real contributions on this MemoryCapsule,
 *     with their real media.
 *   - "Full demo" — seeded stock contributions (9 of them, all
 *     three card types) built on top of this capsule's
 *     recipient name + reveal date so the demo still feels
 *     personal.
 *
 * The toggle + back-to-capsule link live in a thin top bar that
 * sits above the phase, non-destructive (all taps are local
 * state only). When RevealExperience enters a full-screen
 * takeover phase the top bar is still reachable because it's
 * position: fixed + higher z-index than the experience layers.
 */
export function PreviewClient({
  realCapsule,
  realContributions,
  capsuleId,
  stockVoices,
}: {
  realCapsule: RevealCapsule;
  realContributions: RevealContribution[];
  capsuleId: string;
  /** Signed URLs for the admin-uploaded stock voice clips. The
   *  Full demo voice card uses capsuleBirthday; falls back to the
   *  W3C horse placeholder only if R2 isn't configured / the file
   *  hasn't been uploaded. Optional so callers that don't sign
   *  R2 URLs (e.g. the curator preview) still type-check; they
   *  just get the horse fallback. */
  stockVoices?: StockVoiceUrls;
}) {
  const voices = stockVoices ?? { vaultMom: null, capsuleBirthday: null };
  const hasRealContent = realContributions.length > 0;
  // Default to demo when there's nothing real to show — otherwise
  // the organiser would land on an empty Gallery and think the
  // preview is broken.
  const [mode, setMode] = useState<Mode>(hasRealContent ? "real" : "demo");

  // Build the demo data on top of THIS capsule so recipient name
  // + reveal date match what the organiser will actually send.
  const demoCapsule = mockRevealCapsuleBirthday({
    id: realCapsule.id,
    recipientName: realCapsule.recipientName,
    revealDate: realCapsule.revealDate,
    title: realCapsule.title,
  });
  // Build mock contributions with the uploaded stock-voice URL
  // injected into the voice card. Without this, the static
  // MOCK_CAPSULE_CONTRIBUTIONS export plays the W3C horse fallback.
  const demoContributions = buildMockCapsuleContributions({
    capsuleBirthday: voices.capsuleBirthday,
  });

  const capsule = mode === "real" ? realCapsule : demoCapsule;
  const contributions =
    mode === "real" ? realContributions : demoContributions;

  return (
    <div className="relative">
      {/* Top bar — non-destructive, always reachable. */}
      <div
        className="fixed top-0 inset-x-0 z-[250] flex items-center justify-between gap-3 px-3 py-2.5 bg-cream/90 backdrop-blur-md text-navy border-b border-navy/[0.06]"
        style={{ paddingTop: "max(env(safe-area-inset-top), 10px)" }}
      >
        <Link
          href={`/capsules/${capsuleId}`}
          prefetch={false}
          aria-label="Exit preview"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-navy/15 text-[12px] font-bold text-navy hover:border-navy/40 hover:bg-cream transition-colors"
        >
          <X size={12} strokeWidth={2.25} aria-hidden="true" />
          Exit
        </Link>

        <div className="flex items-center gap-1 rounded-full bg-white p-0.5 border border-navy/10 shadow-[0_2px_8px_rgba(15,31,61,0.04)]">
          <ToggleButton
            active={mode === "real"}
            onClick={() => setMode("real")}
            disabled={!hasRealContent}
            title={
              hasRealContent
                ? undefined
                : "No contributions yet — demo only"
            }
          >
            This capsule
          </ToggleButton>
          <ToggleButton active={mode === "demo"} onClick={() => setMode("demo")}>
            <Sparkles
              size={11}
              strokeWidth={2}
              className="inline mr-1 -mt-0.5"
              aria-hidden="true"
            />
            Full demo
          </ToggleButton>
        </div>

        <span className="text-[11px] uppercase tracking-[0.14em] text-amber font-semibold hidden sm:inline">
          Preview
        </span>
      </div>

      {/*
        Key the experience by mode so React unmounts + remounts on
        toggle — that resets the phase state machine to "entry"
        instead of trying to carry an index through a contribution
        list of a different shape.
      */}
      <div style={{ paddingTop: 0 }}>
        <RevealExperience
          key={mode}
          capsule={capsule}
          contributions={contributions}
          allowReplay={false}
        />
      </div>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  disabled,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`px-3 py-1 rounded-full text-[12px] font-semibold transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
        active
          ? "bg-amber text-white"
          : "text-ink-mid hover:text-navy hover:bg-amber-tint"
      }`}
    >
      {children}
    </button>
  );
}
