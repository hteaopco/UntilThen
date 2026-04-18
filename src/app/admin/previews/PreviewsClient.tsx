"use client";

import { useState } from "react";

import { IntroSplash } from "@/components/landing/IntroSplash";
import { CapsuleContributeForm } from "@/app/contribute/capsule/[token]/CapsuleContributeForm";

type Preview = null | "splash" | "contributor-single" | "contributor-couple" | "pin";

const MOCK_SINGLE = {
  title: "Mom's 60th Birthday",
  recipientName: "Margaret Smith",
  occasionType: "BIRTHDAY" as const,
  revealDate: new Date(Date.now() + 30 * 86400000).toISOString(),
  contributorDeadline: null,
};

const MOCK_COUPLE = {
  title: "Mom & Dad's 50th Anniversary",
  recipientName: "Margaret Smith & Robert Smith",
  occasionType: "ANNIVERSARY" as const,
  revealDate: new Date(Date.now() + 30 * 86400000).toISOString(),
  contributorDeadline: null,
};

export function PreviewsClient() {
  const [active, setActive] = useState<Preview>(null);

  if (active === "splash") {
    return <IntroSplash onComplete={() => setActive(null)} />;
  }

  if (active === "contributor-single") {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setActive(null)}
          className="fixed top-4 right-4 z-[300] bg-navy text-white px-3 py-1.5 rounded-lg text-xs font-bold"
        >
          Exit Preview
        </button>
        <CapsuleContributeForm
          token="preview-mode"
          capsule={MOCK_SINGLE}
          invite={{ name: "Sarah" }}
        />
      </div>
    );
  }

  if (active === "contributor-couple") {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setActive(null)}
          className="fixed top-4 right-4 z-[300] bg-navy text-white px-3 py-1.5 rounded-lg text-xs font-bold"
        >
          Exit Preview
        </button>
        <CapsuleContributeForm
          token="preview-mode"
          capsule={MOCK_COUPLE}
          invite={{ name: "Sarah" }}
        />
      </div>
    );
  }

  if (active === "pin") {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            sessionStorage.removeItem("vaultUnlocked");
            setActive(null);
          }}
          className="fixed top-4 right-4 z-[300] bg-navy text-white px-3 py-1.5 rounded-lg text-xs font-bold"
        >
          Exit Preview
        </button>
        <PinPreview />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-mid mb-6">
        Preview interactive flows with mock data. No real capsules or accounts needed.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <PreviewCard
          title="Intro Splash"
          description="The untilThen typewriter animation that plays on first visit."
          onClick={() => {
            try { sessionStorage.removeItem("untilthen:intro-shown"); } catch { /* */ }
            setActive("splash");
          }}
        />
        <PreviewCard
          title="Contributor Flow (Single)"
          description="Full contributor experience: splash → typewriter invite → editor → thank you. Single recipient."
          onClick={() => setActive("contributor-single")}
        />
        <PreviewCard
          title="Contributor Flow (Couple)"
          description="Same flow but with couple recipient — Ann & Bob pronouns and copy."
          onClick={() => setActive("contributor-couple")}
        />
        <PreviewCard
          title="PIN Screen"
          description="Vault PIN entry with setup flow, keyboard support, and unlock animation."
          onClick={() => {
            sessionStorage.removeItem("vaultUnlocked");
            setActive("pin");
          }}
        />
      </div>
    </div>
  );
}

function PreviewCard({ title, description, onClick }: { title: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-xl border border-navy/[0.08] bg-white px-5 py-4 hover:border-amber/30 hover:shadow-[0_6px_20px_rgba(15,31,61,0.06)] transition-all"
    >
      <h3 className="text-[15px] font-bold text-navy tracking-[-0.2px] mb-1">{title}</h3>
      <p className="text-xs text-ink-mid leading-[1.5]">{description}</p>
    </button>
  );
}

function PinPreview() {
  const { VaultPinScreen } = require("@/components/dashboard/VaultPinScreen");
  return <VaultPinScreen />;
}
