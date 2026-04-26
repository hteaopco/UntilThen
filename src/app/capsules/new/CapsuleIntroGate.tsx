"use client";

import { useState } from "react";

import {
  ConfettiOverlay,
  GIFT_CAPSULE_FEATURES,
  OccasionTicker,
  Plan,
} from "@/components/landing/Pricing";

import { CapsuleCreationFlow } from "./CapsuleCreationFlow";

/**
 * /capsules/new has two phases:
 *   1. Intro — the landing-page gift-capsule pricing card
 *      (`$9.99 one-time` Plan) rendered full-bleed, with its CTA
 *      rewired to flip the page into phase 2 instead of navigating.
 *   2. Wizard — the original 5-step CapsuleCreationFlow.
 *
 * Splitting the phase into client state keeps the URL stable at
 * /capsules/new and lets visitors see the pitch + price before
 * committing to the form.
 *
 * Wedding visitors (initialOccasion="WEDDING") skip the intro
 * entirely — they came from /weddings which already shows the
 * pitch and the $99.99 price; dropping them straight into the
 * flow with WEDDING pre-selected is the right move.
 */
export function CapsuleIntroGate({
  initialOccasion,
}: {
  initialOccasion?: "WEDDING";
}) {
  const [phase, setPhase] = useState<"intro" | "flow">(
    initialOccasion ? "flow" : "intro",
  );

  if (phase === "flow") {
    return <CapsuleCreationFlow initialOccasion={initialOccasion} />;
  }

  return (
    <main className="min-h-screen bg-cream flex items-start justify-center pb-16">
      <div className="mx-auto w-full max-w-[440px] px-6 pt-10 sm:pt-14">
        <Plan
          variant="gift"
          tag="Gift Capsules"
          name="One-time Purchase"
          price="9.99"
          priceUnit="one-time"
          features={GIFT_CAPSULE_FEATURES}
          cta="Create a Gift Capsule"
          onCtaClick={() => setPhase("flow")}
          overlay={<ConfettiOverlay />}
          billingToggle={<OccasionTicker />}
        />
      </div>
    </main>
  );
}
