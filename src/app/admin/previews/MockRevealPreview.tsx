"use client";

import { X } from "lucide-react";

import {
  MOCK_CONTRIBUTIONS,
  mockRevealCapsule,
} from "@/app/reveal/[token]/mockData";
import { RevealExperience } from "@/app/reveal/[token]/RevealExperience";

/**
 * Admin-only mock recipient reveal. Renders the same
 * RevealExperience component the production /reveal/[token]
 * route uses — just with seed data + public stock media — so
 * admins can QA the full Entry → Stories → Transition → Gallery
 * flow without needing a real capsule with real contributions.
 */
export function MockRevealPreview({ onExit }: { onExit: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] bg-black">
      <RevealExperience
        capsule={mockRevealCapsule()}
        contributions={MOCK_CONTRIBUTIONS}
      />
      <button
        type="button"
        onClick={onExit}
        className="fixed bottom-4 right-4 z-[300] inline-flex items-center gap-2 rounded-full bg-navy text-white px-4 py-2 text-xs font-bold shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:bg-navy/90 transition-colors"
      >
        <X size={14} strokeWidth={2.25} />
        Exit preview
      </button>
    </div>
  );
}
