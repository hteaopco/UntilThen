"use client";

import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  MOCK_CONTRIBUTIONS,
  mockRevealCapsule,
} from "@/app/reveal/[token]/mockData";
import {
  RevealExperience,
  type RevealCapsule,
  type RevealContribution,
} from "@/app/reveal/[token]/RevealExperience";

type Mode = "real" | "demo";

/**
 * Vault preview wrapper — mirrors the gift-capsule preview at
 * /capsules/[id]/preview/PreviewClient.tsx but scoped to a child
 * vault.
 *
 *   "This vault" → real sealed entries on this child's vault
 *   "Full demo"  → seeded stock contributions on top of this
 *                  child's first name + reveal date so the demo
 *                  still feels personal when the vault is empty
 *                  or has only one or two entries
 *
 * Both render through the same RevealExperience component the
 * recipient sees at /reveal/[token].
 */
export function VaultPreviewClient({
  realCapsule,
  realContributions,
  childId,
}: {
  realCapsule: RevealCapsule;
  realContributions: RevealContribution[];
  childId: string;
}) {
  const hasRealContent = realContributions.length > 0;
  const [mode, setMode] = useState<Mode>(hasRealContent ? "real" : "demo");

  const demoCapsule = mockRevealCapsule({
    id: realCapsule.id,
    recipientName: realCapsule.recipientName,
    revealDate: realCapsule.revealDate,
    title: realCapsule.title,
  });

  const capsule = mode === "real" ? realCapsule : demoCapsule;
  const contributions = mode === "real" ? realContributions : MOCK_CONTRIBUTIONS;

  return (
    <div className="relative">
      <div
        className="fixed top-0 inset-x-0 z-[250] flex items-center justify-between gap-3 px-3 py-2.5 bg-cream/90 backdrop-blur-md text-navy border-b border-navy/[0.06]"
        style={{ paddingTop: "max(env(safe-area-inset-top), 10px)" }}
      >
        <Link
          href={`/vault/${childId}`}
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-mid hover:text-navy transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Back
        </Link>

        <div className="flex items-center gap-1 rounded-full bg-white p-0.5 border border-navy/10 shadow-[0_2px_8px_rgba(15,31,61,0.04)]">
          <ToggleButton
            active={mode === "real"}
            onClick={() => setMode("real")}
            disabled={!hasRealContent}
            title={
              hasRealContent
                ? undefined
                : "No sealed entries yet — demo only"
            }
          >
            This vault
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

      <RevealExperience
        key={mode}
        capsule={capsule}
        contributions={contributions}
      />
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
