"use client";

import { useState } from "react";

import { IntroSplash } from "@/components/landing/IntroSplash";
import { CapsuleContributeForm } from "@/app/contribute/capsule/[token]/CapsuleContributeForm";
import { FirstScreen } from "@/app/capsule/[id]/open/FirstScreen";
import { SequentialRevealScreen } from "@/app/capsule/[id]/open/SequentialRevealScreen";
import { ListScreen } from "@/app/capsule/[id]/open/ListScreen";
import { LockedVaultView } from "@/app/vault/[childId]/child-view/LockedVaultView";
import { triggerCelebration } from "@/lib/confetti";

type Preview =
  | null
  | "splash"
  | "contributor-single"
  | "contributor-couple"
  | "pin"
  | "reveal-first"
  | "reveal-sequence"
  | "reveal-list"
  | "vault-locked"
  | "vault-unlocked";

const MOCK_SINGLE_CAPSULE = {
  title: "Mom's 60th Birthday",
  recipientName: "Margaret Smith",
  occasionType: "BIRTHDAY" as const,
  revealDate: new Date(Date.now() + 30 * 86400000).toISOString(),
  contributorDeadline: null,
};

const MOCK_COUPLE_CAPSULE = {
  title: "Mom & Dad's 50th Anniversary",
  recipientName: "Margaret Smith & Robert Smith",
  occasionType: "ANNIVERSARY" as const,
  revealDate: new Date(Date.now() + 30 * 86400000).toISOString(),
  contributorDeadline: null,
};

const MOCK_REVEAL_CAPSULE = {
  id: "preview-capsule",
  title: "Sarah's 30th Birthday",
  recipientName: "Sarah Johnson",
  occasionType: "BIRTHDAY" as const,
  revealDate: new Date().toISOString(),
  hasAccount: false,
};

const MOCK_CONTRIBUTIONS = [
  {
    id: "c1",
    authorName: "Mom",
    type: "TEXT" as const,
    title: "Happy 30th, sweetheart",
    body: "<p>You've grown into such an incredible person. Every day I watch you navigate this world with grace and kindness, and I couldn't be more proud. I remember the day you were born like it was yesterday — tiny hands, big lungs, and a spirit that hasn't stopped since.</p><p>I love you more than words could ever say.</p>",
  },
  {
    id: "c2",
    authorName: "Dad",
    type: "TEXT" as const,
    title: null,
    body: "<p>Kid, you've always been braver than you think. Remember when you were seven and climbed that oak tree in the backyard? You got to the top and froze — but you didn't cry. You just looked down and said, \"I'll figure it out.\" That's who you are. Happy birthday.</p>",
  },
  {
    id: "c3",
    authorName: "Best Friend Alex",
    type: "TEXT" as const,
    title: "To my person",
    body: "<p>20 years of friendship and you still make me laugh harder than anyone. Here's to 20 more of late-night talks, terrible karaoke, and being each other's emergency contact. Love you forever.</p>",
  },
  {
    id: "c4",
    authorName: "Grandma Rose",
    type: "TEXT" as const,
    title: null,
    body: "<p>My darling girl. You have your grandfather's eyes and your mother's heart. What a combination. Happy birthday from the one who loved you first.</p>",
  },
  {
    id: "c5",
    authorName: "Brother Jake",
    type: "TEXT" as const,
    title: "From your favorite sibling",
    body: "<p>I know I don't say it enough, but you're the best sister anyone could ask for. Even when you steal my fries. Especially then. Happy 30th, sis.</p>",
  },
];

const MOCK_VAULT_ENTRIES = [
  { id: "e1", type: "TEXT" as const, author: "Mom" },
  { id: "e2", type: "TEXT" as const, author: "Dad" },
  { id: "e3", type: "PHOTO" as const, author: "Mom" },
  { id: "e4", type: "VOICE" as const, author: "Grandma Rose" },
  { id: "e5", type: "TEXT" as const, author: "Dad" },
  { id: "e6", type: "VIDEO" as const, author: "Mom" },
];

const MOCK_VAULT_COLLECTIONS = [
  { id: "col1", title: "First Year", coverEmoji: "👶", entryCount: 12 },
  { id: "col2", title: "School Days", coverEmoji: "🎒", entryCount: 8 },
];

function ExitButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed top-4 right-4 z-[300] bg-navy text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg"
    >
      Exit Preview
    </button>
  );
}

export function PreviewsClient() {
  const [active, setActive] = useState<Preview>(null);

  if (active === "splash") {
    return <IntroSplash onComplete={() => setActive(null)} />;
  }

  if (active === "contributor-single") {
    return (
      <div className="relative">
        <ExitButton onClick={() => setActive(null)} />
        <CapsuleContributeForm
          token="preview-mode"
          capsule={MOCK_SINGLE_CAPSULE}
          invite={{ name: "Sarah" }}
        />
      </div>
    );
  }

  if (active === "contributor-couple") {
    return (
      <div className="relative">
        <ExitButton onClick={() => setActive(null)} />
        <CapsuleContributeForm
          token="preview-mode"
          capsule={MOCK_COUPLE_CAPSULE}
          invite={{ name: "Sarah" }}
        />
      </div>
    );
  }

  if (active === "pin") {
    return (
      <div className="relative">
        <ExitButton onClick={() => {
          sessionStorage.removeItem("vaultUnlocked");
          setActive(null);
        }} />
        <PinPreview />
      </div>
    );
  }

  if (active === "reveal-first") {
    return (
      <div className="relative">
        <ExitButton onClick={() => setActive(null)} />
        <FirstScreen
          capsule={MOCK_REVEAL_CAPSULE}
          contributionCount={MOCK_CONTRIBUTIONS.length}
          onOpen={() => {
            void triggerCelebration();
            setActive("reveal-sequence");
          }}
        />
      </div>
    );
  }

  if (active === "reveal-sequence") {
    return (
      <div className="relative">
        <ExitButton onClick={() => setActive(null)} />
        <SequentialRevealScreen
          contributions={MOCK_CONTRIBUTIONS}
          onComplete={() => setActive("reveal-list")}
        />
      </div>
    );
  }

  if (active === "reveal-list") {
    return (
      <div className="relative">
        <ExitButton onClick={() => setActive(null)} />
        <ListScreen
          capsule={MOCK_REVEAL_CAPSULE}
          token="preview-token"
          contributions={MOCK_CONTRIBUTIONS}
          preview={true}
        />
      </div>
    );
  }

  if (active === "vault-locked") {
    return (
      <div className="relative">
        <ExitButton onClick={() => setActive(null)} />
        <main className="min-h-screen bg-[#f5f7f0]">
          <LockedVaultView
            childFirstName="Olivia"
            revealDate={new Date(Date.now() + 365 * 86400000).toISOString()}
            entries={MOCK_VAULT_ENTRIES}
            collections={MOCK_VAULT_COLLECTIONS}
          />
        </main>
      </div>
    );
  }

  if (active === "vault-unlocked") {
    return (
      <div className="relative">
        <ExitButton onClick={() => setActive(null)} />
        <main className="min-h-screen bg-[#f5f7f0]">
          <LockedVaultView
            childFirstName="Olivia"
            revealDate={new Date(Date.now() - 86400000).toISOString()}
            entries={MOCK_VAULT_ENTRIES}
            collections={MOCK_VAULT_COLLECTIONS}
          />
        </main>
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
          description="The untilThen typewriter animation."
          onClick={() => {
            try { sessionStorage.removeItem("untilthen:intro-shown"); } catch { /* */ }
            setActive("splash");
          }}
        />
        <PreviewCard
          title="Contributor Flow (Single)"
          description="Splash, typewriter invite, rich editor, thank you. Single recipient."
          onClick={() => setActive("contributor-single")}
        />
        <PreviewCard
          title="Contributor Flow (Couple)"
          description="Same flow with couple recipient — they/them pronouns."
          onClick={() => setActive("contributor-couple")}
        />
        <PreviewCard
          title="Gift Capsule Reveal"
          description="Full reveal with confetti: emotional hook, sequential guided reveal (5 letters), browseable list."
          onClick={() => setActive("reveal-first")}
        />
        <PreviewCard
          title="Time Capsule — Locked"
          description="What the child sees before the reveal date: countdown timer, sealed memories list, locked vault animation."
          onClick={() => setActive("vault-locked")}
        />
        <PreviewCard
          title="Time Capsule — Unlocked"
          description="What the child sees after the reveal date: vault is ready, memories accessible."
          onClick={() => setActive("vault-unlocked")}
        />
        <PreviewCard
          title="PIN Screen"
          description="Vault PIN setup, unlock animation, keyboard support."
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
