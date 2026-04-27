"use client";

import { ArrowRight, Bookmark, Sparkles } from "lucide-react";
import { useEffect } from "react";

import { useRevealAnalytics } from "./analytics";

/**
 * Phase 3.5 — Save prompt.
 *
 * Sits between the cinematic flow (entry / stories / transition)
 * and the gallery on a recipient's first visit. Asks them to
 * either save the capsule to a real account (so they can revisit
 * without the magic link) or skip straight into the full archive.
 *
 * Skipping doesn't lose the option — the gallery surfaces a
 * persistent banner with the same "save to your account" CTA so a
 * recipient who deferred can still claim the capsule later.
 *
 * Suppressed entirely when capsule.isSaved is already true (the
 * recipient is returning after a successful claim, or the magic
 * link was opened by an already-signed-in account that has
 * claimed it via a previous session).
 */
export function SavePromptScreen({
  recipientName,
  onSave,
  onSkip,
}: {
  recipientName: string;
  onSave: () => void;
  onSkip: () => void;
}) {
  const { capture } = useRevealAnalytics();
  useEffect(() => {
    capture("reveal_save_prompt_viewed");
  }, [capture]);

  const firstName = recipientName.split(" ")[0] ?? recipientName;

  return (
    <main
      // z-[260] for the same reason TransitionScreen uses it: the
      // organiser preview top bar (z-[250]) shouldn't peek above
      // this full-screen takeover during preview flows.
      className="fixed inset-0 z-[260] flex flex-col items-center justify-center px-6 text-center"
      style={{
        background:
          "radial-gradient(ellipse at 18% 22%, rgba(224, 154, 90, 0.18) 0%, transparent 38%), " +
          "radial-gradient(ellipse at 82% 78%, rgba(196, 122, 58, 0.22) 0%, transparent 42%), " +
          "radial-gradient(ellipse at 50% 50%, rgba(253, 243, 233, 1) 0%, rgba(253, 248, 242, 1) 100%)",
        paddingTop: "max(env(safe-area-inset-top), 24px)",
        paddingBottom: "max(env(safe-area-inset-bottom), 24px)",
      }}
    >
      <Sparkles
        size={22}
        strokeWidth={1.5}
        className="text-amber mb-6"
        aria-hidden="true"
      />

      <h2 className="font-serif text-navy text-[26px] leading-[1.25] tracking-[-0.3px] max-w-[20ch]">
        Replay anytime, save to your account.
      </h2>

      <p className="mt-4 max-w-[300px] text-[14px] leading-[1.6] text-ink-mid">
        Sign in or sign up so {firstName ? `${firstName}'s` : "this"} capsule
        stays here for you &mdash; no magic link required to come back.
      </p>

      <button
        type="button"
        onClick={() => {
          capture("reveal_save_prompt_save");
          onSave();
        }}
        className="mt-10 inline-flex items-center gap-2 rounded-full bg-amber px-7 text-white text-[15px] font-bold tracking-[0.01em] hover:bg-amber-dark active:opacity-90 transition-colors"
        style={{ height: "48px" }}
      >
        <Bookmark size={16} strokeWidth={2} aria-hidden="true" />
        Save to your account
      </button>

      <button
        type="button"
        onClick={() => {
          capture("reveal_save_prompt_skip");
          onSkip();
        }}
        className="mt-3 inline-flex items-center gap-2 text-amber text-[14px] font-semibold hover:text-amber-dark transition-colors"
      >
        Skip to everything
        <ArrowRight size={14} strokeWidth={2} aria-hidden="true" />
      </button>
    </main>
  );
}
