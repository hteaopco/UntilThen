"use client";

import { ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";

import { IntroSplash } from "@/components/landing/IntroSplash";
import { CapsuleContributeForm } from "@/app/contribute/capsule/[token]/CapsuleContributeForm";
import {
  TONE_LABELS,
  TONE_EMOJI,
  type CapsuleTone,
} from "@/lib/tone";

import { MockRevealPreview } from "./MockRevealPreview";
import type { RecentCapsule, StockVoiceUrls } from "./page";

type Preview =
  | null
  | "splash"
  | "contributor-single"
  | "contributor-couple"
  | "pin"
  | "mock-reveal";

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

const TONE_OPTIONS: CapsuleTone[] = [
  "CELEBRATION",
  "GRATITUDE",
  "THINKING_OF_YOU",
  "ENCOURAGEMENT",
  "LOVE",
  "OTHER",
];

export function PreviewsClient({
  capsules,
  stockVoices,
}: {
  capsules: RecentCapsule[];
  stockVoices: StockVoiceUrls;
}) {
  const [active, setActive] = useState<Preview>(null);
  const [previewTone, setPreviewTone] = useState<CapsuleTone>("CELEBRATION");

  if (active === "splash") {
    return <IntroSplash onComplete={() => setActive(null)} />;
  }

  if (active === "mock-reveal") {
    return (
      <MockRevealPreview
        onExit={() => setActive(null)}
        stockVoices={stockVoices}
      />
    );
  }

  if (active === "contributor-single") {
    return (
      <div className="relative">
        <ExitButton onClick={() => setActive(null)} />
        <CapsuleContributeForm
          token="preview-mode"
          capsule={{ ...MOCK_SINGLE_CAPSULE, tone: previewTone }}
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
          capsule={{ ...MOCK_COUPLE_CAPSULE, tone: previewTone }}
          invite={{ name: "Sarah" }}
        />
      </div>
    );
  }

  if (active === "pin") {
    return (
      <div className="relative">
        <ExitButton
          onClick={() => {
            sessionStorage.removeItem("vaultUnlocked");
            setActive(null);
          }}
        />
        <PinPreview />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-ink-mid">
        Preview interactive flows. Mock-data flows on the left; real-data
        recipient reveal links on the right.
      </p>

      {/* Tone selector — only affects the contributor-flow previews. */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] uppercase tracking-[0.12em] font-bold text-ink-mid">
          Tone for contributor previews:
        </span>
        {TONE_OPTIONS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setPreviewTone(t)}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
              previewTone === t
                ? "bg-amber text-white border-amber"
                : "border-navy/15 text-ink-mid hover:border-amber/40"
            }`}
          >
            {TONE_EMOJI[t]} {TONE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Mock-data flows */}
      <section>
        <h2 className="text-[11px] uppercase tracking-[0.14em] font-bold text-ink-mid mb-3">
          Mock-data flows
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <PreviewCard
            title="Recipient Reveal — Mock Capsule"
            description="Full Entry → Stories → Transition → Gallery flow with seed data: 9 contributions (letters, photos, voice notes) and public stock media. No real capsule needed."
            onClick={() => setActive("mock-reveal")}
          />
          <PreviewCard
            title="Intro Splash"
            description="The untilThen typewriter animation."
            onClick={() => {
              try {
                sessionStorage.removeItem("untilthen:intro-shown");
              } catch {
                /* */
              }
              setActive("splash");
            }}
          />
          <PreviewCard
            title="Contributor Flow (Single)"
            description={`${TONE_EMOJI[previewTone]} ${TONE_LABELS[previewTone]} tone. Splash, invite, editor, thank you.`}
            onClick={() => setActive("contributor-single")}
          />
          <PreviewCard
            title="Contributor Flow (Couple)"
            description={`${TONE_EMOJI[previewTone]} ${TONE_LABELS[previewTone]} tone. Same flow with couple pronouns.`}
            onClick={() => setActive("contributor-couple")}
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
      </section>

      {/* Real-capsule recipient reveal */}
      <RecipientRevealList capsules={capsules} />
    </div>
  );
}

function RecipientRevealList({ capsules }: { capsules: RecentCapsule[] }) {
  const [filter, setFilter] = useState<"all" | "ready" | "sealed">("all");

  const filtered = useMemo(() => {
    if (filter === "all") return capsules;
    const now = Date.now();
    if (filter === "ready") {
      return capsules.filter((c) => new Date(c.revealDate).getTime() <= now);
    }
    return capsules.filter((c) => new Date(c.revealDate).getTime() > now);
  }, [capsules, filter]);

  return (
    <section>
      <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
        <h2 className="text-[11px] uppercase tracking-[0.14em] font-bold text-ink-mid">
          Recipient reveal · real capsules
        </h2>
        <div className="flex items-center gap-1">
          <FilterPill active={filter === "all"} onClick={() => setFilter("all")}>
            All ({capsules.length})
          </FilterPill>
          <FilterPill active={filter === "ready"} onClick={() => setFilter("ready")}>
            Past reveal date
          </FilterPill>
          <FilterPill active={filter === "sealed"} onClick={() => setFilter("sealed")}>
            Still sealed
          </FilterPill>
        </div>
      </div>

      <p className="text-xs text-ink-light mb-3 leading-[1.55]">
        Opens <code className="text-[11px]">/reveal/{"{accessToken}"}</code> in
        a new tab. Capsules whose reveal date hasn&rsquo;t passed will land on
        the &ldquo;opens on …&rdquo; sealed screen rather than the full flow.
      </p>

      {filtered.length === 0 ? (
        <p className="text-sm text-ink-light italic px-4 py-6 rounded-xl border border-dashed border-navy/10 bg-warm-surface/40 text-center">
          {capsules.length === 0
            ? "No capsules in the database yet."
            : "No capsules match this filter."}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((c) => {
            const past = new Date(c.revealDate).getTime() <= Date.now();
            return (
              <li
                key={c.id}
                className="rounded-xl border border-navy/[0.08] bg-white px-4 py-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-navy truncate">
                      {c.title}
                    </span>
                    <StatusBadge status={c.status} />
                    {!c.isPaid && <UnpaidBadge />}
                  </div>
                  <p className="text-xs text-ink-light mt-0.5 truncate">
                    For {c.recipientName} · {c.contributionCount}{" "}
                    contribution{c.contributionCount !== 1 ? "s" : ""} ·{" "}
                    {past ? "opened on " : "opens "}
                    {new Date(c.revealDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <a
                  href={`/reveal/${encodeURIComponent(c.accessToken)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1.5 bg-amber text-white px-3 py-1.5 rounded-lg text-[12px] font-bold hover:bg-amber-dark transition-colors"
                >
                  Open reveal
                  <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
        active
          ? "bg-navy text-white border-navy"
          : "border-navy/15 text-ink-mid hover:border-navy/40"
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "ACTIVE"
      ? "text-amber bg-amber-tint"
      : status === "SEALED"
        ? "text-gold bg-gold-tint"
        : status === "REVEALED"
          ? "text-green-700 bg-green-50"
          : "text-ink-light bg-[#f1f5f9]";
  return (
    <span
      className={`text-[9px] uppercase tracking-[0.1em] font-bold px-2 py-0.5 rounded ${cls}`}
    >
      {status}
    </span>
  );
}

function UnpaidBadge() {
  return (
    <span className="text-[9px] uppercase tracking-[0.1em] font-bold px-2 py-0.5 rounded text-red-700 bg-red-50">
      unpaid
    </span>
  );
}

function PreviewCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-xl border border-navy/[0.08] bg-white px-5 py-4 hover:border-amber/30 hover:shadow-[0_6px_20px_rgba(15,31,61,0.06)] transition-all"
    >
      <h3 className="text-[15px] font-bold text-navy tracking-[-0.2px] mb-1">
        {title}
      </h3>
      <p className="text-xs text-ink-mid leading-[1.5]">{description}</p>
    </button>
  );
}

function PinPreview() {
  const { VaultPinScreen } = require("@/components/dashboard/VaultPinScreen");
  return <VaultPinScreen />;
}
