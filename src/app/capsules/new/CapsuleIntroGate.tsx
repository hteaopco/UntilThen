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
 * Two paths skip the intro and land straight in the wizard:
 *   - Wedding visitors (initialOccasion="WEDDING") came from
 *     /weddings which already shows the $99.00 price; the
 *     gift-capsule intro is irrelevant for them.
 *   - Enterprise visitors (attribution="enterprise") came from
 *     the /enterprise dashboard CTA; their org covers the cost
 *     so the $9.99 price card would be misleading.
 *
 * Personal-attribution org members (visiting /capsules/new
 * directly, no source param) DO see the intro and pay the $9.99
 * — they're a paying personal customer in that flow even though
 * they happen to belong to an org.
 */
export function CapsuleIntroGate({
  initialOccasion,
  attribution = "personal",
}: {
  initialOccasion?: "WEDDING";
  attribution?: "personal" | "enterprise";
}) {
  const skipIntro = attribution === "enterprise";
  const [phase, setPhase] = useState<"intro" | "flow">(
    initialOccasion || skipIntro ? "flow" : "intro",
  );

  if (phase === "flow") {
    return (
      <CapsuleCreationFlow
        initialOccasion={initialOccasion}
        attribution={attribution}
      />
    );
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
