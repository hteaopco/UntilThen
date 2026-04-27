"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import {
  RevealExperience,
  type RevealCapsule,
  type RevealContribution,
} from "@/app/reveal/[token]/RevealExperience";

/**
 * Drives the full cinematic reveal experience (gate → entry →
 * story cards → gallery, with background music) for a wedding
 * guest's own just-submitted contribution. Same component the
 * recipient sees on reveal day — we just feed it a single-item
 * contribution array so the preview only shows the previewer's
 * own message.
 *
 * Data flow:
 *   1. Mount → fetch /api/wedding/contribute/<token>/preview
 *      ?contributionId=… which returns the capsule + contribution
 *      shaped exactly like /api/reveal/<token>, with R2 media
 *      pre-signed.
 *   2. Render RevealExperience with:
 *      - gateHeaderSlot: the "this is a preview" banner.
 *      - galleryExit: hand-off to /weddings labelled
 *        "Exit preview".
 *      - onCompleted: opens the explainer modal once the user
 *        actually reaches the gallery (the moment when the
 *        "only your message is here right now" reality lands).
 */
export function WeddingPreviewExperience({
  guestToken,
  contributionId,
  coupleNames,
}: {
  guestToken: string;
  contributionId: string;
  coupleNames: string;
}) {
  const [data, setData] = useState<{
    capsule: RevealCapsule;
    contribution: RevealContribution;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [explainerOpen, setExplainerOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(
          `/api/wedding/contribute/${encodeURIComponent(guestToken)}/preview?contributionId=${encodeURIComponent(contributionId)}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          if (!cancelled)
            setErrorMessage("Couldn't load your preview. Please try again.");
          return;
        }
        const body = (await res.json()) as {
          capsule: RevealCapsule;
          contribution: RevealContribution;
        };
        if (!cancelled) setData(body);
      } catch {
        if (!cancelled)
          setErrorMessage("Couldn't load your preview. Please try again.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [guestToken, contributionId]);

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 text-center">
        <p className="text-[15px] text-navy max-w-[360px]">{errorMessage}</p>
        <Link
          href="/weddings"
          className="mt-5 inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-amber text-white text-[14px] font-bold hover:bg-amber-dark transition-colors"
        >
          Back to weddings
        </Link>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-cream flex items-center justify-center">
        <p className="text-[13px] text-ink-mid">Preparing your preview…</p>
      </main>
    );
  }

  return (
    <>
      <RevealExperience
        capsule={data.capsule}
        contributions={[data.contribution]}
        gateHeaderSlot={<PreviewGateBanner coupleNames={coupleNames} />}
        galleryExit={{ href: "/weddings", label: "Exit preview" }}
        onCompleted={() => setExplainerOpen(true)}
      />
      {explainerOpen && (
        <PreviewExplainerModal
          coupleNames={coupleNames}
          onClose={() => setExplainerOpen(false)}
        />
      )}
    </>
  );
}

/**
 * Sits at the top of the GateScreen via gateHeaderSlot. Sets the
 * expectation up-front: this preview will be the same flow the
 * couple sees, but limited to the contributor's own message.
 */
function PreviewGateBanner({ coupleNames }: { coupleNames: string }) {
  return (
    <div className="px-6 pt-5 pb-3">
      <div className="mx-auto max-w-[480px] rounded-2xl border border-amber/40 bg-white/80 backdrop-blur-sm px-5 py-4 text-center shadow-[0_4px_14px_rgba(196,122,58,0.08)]">
        <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.16em] font-bold text-amber mb-1.5">
          Preview
        </p>
        <p className="text-[14px] text-navy leading-[1.55]">
          This is a preview of your own message. On reveal day,{" "}
          <span className="font-bold">{coupleNames}</span> will see yours
          alongside every other guest&rsquo;s.
        </p>
      </div>
    </div>
  );
}

/**
 * Auto-opens the moment the contributor lands in the gallery.
 * Makes the limitation explicit and offers a polite exit.
 */
function PreviewExplainerModal({
  coupleNames,
  onClose,
}: {
  coupleNames: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-5 bg-navy/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.4)] w-full max-w-[440px] px-6 py-6"
      >
        <h2 className="text-[18px] font-extrabold text-navy tracking-[-0.2px]">
          Just yours, for now
        </h2>
        <p className="mt-2 text-[14px] text-ink-mid leading-[1.55]">
          {coupleNames} will be able to filter through every message left for
          them in this gallery. Right now only yours appears, but on reveal
          day they&rsquo;ll have access to everyone&rsquo;s. Thank you for
          contributing.
        </p>
        <div className="mt-5 flex gap-2">
          <Link
            href="/weddings"
            className="flex-1 inline-flex items-center justify-center bg-amber text-white py-2.5 rounded-lg text-[14px] font-bold hover:bg-amber-dark transition-colors"
          >
            Exit preview
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-[13px] font-semibold border border-navy/15 text-ink-mid hover:text-navy hover:border-navy/30 transition-colors"
          >
            Keep looking
          </button>
        </div>
      </div>
    </div>
  );
}
