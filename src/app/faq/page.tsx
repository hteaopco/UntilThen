import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/landing/Footer";
import { TopNav } from "@/components/ui/TopNav";
import {
  Accordion,
  type AccordionSection,
} from "@/components/ui/Accordion";

export const metadata: Metadata = {
  title: "FAQ — untilThen",
  description:
    "Everything you need to know about untilThen — a time capsule app for the people you love.",
};

const SUPPORT_EMAIL = "hello@untilthenapp.io";

const SECTIONS: AccordionSection[] = [
  {
    label: "Getting Started",
    items: [
      {
        question: "What is untilThen?",
        answer:
          "untilThen is a time capsule app where you write letters, record voice notes, and upload photos and videos for someone you love — sealed until a moment that matters. Create a Time Capsule for your child that opens on their 18th birthday, build a Gift Capsule for a birthday, retirement, or farewell where friends and family all contribute, or seal a wedding capsule that the couple opens together on their first anniversary. untilThen is also available for teams — companies use it to celebrate employee milestones in a way people actually remember.",
      },
      {
        question: "What's the difference between a Time Capsule and a Gift Capsule?",
        answer:
          "Two different products. A Time Capsule lives in your Vault — long-form, written by you over weeks or years, opened on a future milestone you choose. Best for things like a letter-a-week to your kids or a private record sealed until a future anniversary. Subscription product, $4.99/month (3 capsules included). A Gift Capsule is a one-off — you organise it for a specific occasion (birthday, retirement, graduation, wedding) and invite friends and family to add their own messages alongside yours. Multi-contributor, opened all at once on the reveal day. One-time $9.99 charge per capsule, no subscription required.",
      },
      {
        question: "When does the recipient get access to their Time Capsule?",
        answer:
          "On the reveal date, the recipient gets an email with a private link to open their Time Capsule. Until that day, no content has been sent to them — there's nothing to log into and nothing for them to find. The link works after the reveal date too, so they can come back any time to revisit what was opened.",
      },
      {
        question: "Can I start a Time Capsule before the recipient is ready?",
        answer:
          "Yes — many people start writing well before the recipient is even old enough to read. New parents often write their first entry before their child arrives. You can set or update the reveal date at any time before sealing.",
      },
    ],
  },
  {
    label: "Security & Privacy",
    items: [
      {
        question: "Can the recipient open entries before the reveal date?",
        answer:
          "No. Locked entries are never sent to their device — not even hidden. The content doesn't exist on their side until the reveal date passes. There is nothing to find.",
      },
      {
        question: "What if I pass away before the reveal date?",
        answer:
          "During onboarding you nominate a trusted person — a partner, sibling, or close friend. If your account is inactive for 12 or more months, they can request access to transfer your Vault. We verify this manually before any transfer happens.",
      },
      {
        question: "Can I edit an entry after sealing it?",
        answer:
          "Yes — until the Time Capsule unlocks. Once the reveal date passes and the recipient opens it, entries are permanently locked. We think there's something meaningful about that.",
      },
      {
        question: "Who can see my entries?",
        answer:
          "Only you. The recipient cannot see any content until the reveal date. untilThen staff do not access your entries. All content is encrypted at rest.",
      },
    ],
  },
  {
    label: "Pricing & Billing",
    items: [
      {
        question: "How much does untilThen cost?",
        answer:
          "Two pricing models depending on which product you use. The Vault subscription is $4.99 per month and includes 3 Time Capsules — each additional Time Capsule is $0.99/month. Annual pricing is $35.99 per year (additional capsules $6.00/year each), saving around 40%. All Vault subscriptions start with a 7-day free trial; no credit card required to start. Gift Capsules are pay-once: $9.99 per Gift Capsule, no subscription required. You can mix and match — many people keep a Vault running for long-form letters and also organise the occasional Gift Capsule for someone's birthday.",
      },
      {
        question: "What happens if I cancel my subscription?",
        answer:
          "Your entries are preserved for 12 months after cancellation. We'll email you before deleting anything. You can resubscribe at any time and pick up exactly where you left off.",
      },
      {
        question: "What happens to my Time Capsules if I stop paying?",
        answer:
          "Your Vault enters read-only mode — you can view entries but not add new ones. Reveal dates are unaffected. If a reveal date arrives while your account is paused, the Time Capsule still unlocks for the recipient.",
      },
    ],
  },
  {
    label: "Edge Cases",
    items: [
      {
        question: "What if the recipient doesn't want to open it?",
        answer:
          "That's entirely their choice. The Time Capsule stays accessible indefinitely — they can open it the day it unlocks or years later. It never expires.",
      },
      {
        question: "What if I lose access to my account?",
        answer: `Use the standard password reset flow. If you've lost access to your email as well, contact us at ${SUPPORT_EMAIL} and we'll verify your identity before restoring access.`,
      },
      {
        question: "What if my situation changes?",
        answer:
          "You can update your nominated trustee or transfer Vault ownership at any time from your account settings.",
      },
      {
        question: "How long do you store my memories?",
        answer:
          "For as long as your subscription is active. If untilThen ever shuts down — which we plan never to do — we'll give you 6 months notice and a full data export of everything you've created.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <>
      <TopNav />
      <main className="min-h-screen bg-cream pt-10 pb-20 px-6 lg:px-14">
        <div className="mx-auto max-w-[720px]">
          {/* Header */}
          <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-amber mb-3.5">
            FAQ
          </p>
          <h1 className="text-[clamp(32px,4.5vw,48px)] font-extrabold tracking-[-1.5px] text-navy leading-[1.08] mb-5">
            Everything you need to know.
          </h1>
          <p className="text-base text-ink-mid leading-[1.7]">
            Can&rsquo;t find your answer?
            <br />
            Email us at{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-amber hover:text-navy transition-colors font-medium"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>

          {/* Why We Built untilThen — always-visible banner. Kept
              above the accordion so visitors meet the "why" before
              the operational FAQ. Brand-amber treatment so it
              reads as the founder's voice, not another FAQ row. */}
          <section
            aria-labelledby="why-we-built"
            className="mt-10 rounded-2xl border border-amber/30 bg-amber-tint/50 px-6 py-7 sm:px-8 sm:py-9 shadow-[0_4px_18px_rgba(196,122,58,0.06)]"
          >
            <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.18em] text-amber mb-2">
              A note from us
            </p>
            <h2
              id="why-we-built"
              className="text-[22px] sm:text-[26px] font-extrabold text-navy tracking-[-0.4px] mb-4 leading-[1.2]"
            >
              Why We Built untilThen
            </h2>
            <div className="space-y-3.5 text-[15px] sm:text-[16px] text-navy/85 leading-[1.65]">
              <p>
                Proverbs 18:21 says{" "}
                <em>the power of life and death are in the tongue</em>. The
                words we speak &mdash; and the ones we never get around to
                saying &mdash; shape the people we love more than we realize.
              </p>
              <p>
                Jesus said that{" "}
                <em>out of the overflow of the heart, the mouth speaks</em>.
                We built untilThen because most of us have a full heart and
                an empty page. We mean to say the thing. We plan to write the
                letter. And then life moves fast and the moment passes.
              </p>
              <p>
                untilThen exists to close that gap &mdash; to give the words
                in your heart a place to live until the moment they&rsquo;re
                needed most.
              </p>
            </div>
          </section>

          {/* Accordion */}
          <Accordion sections={SECTIONS} />

          {/* Bottom CTA */}
          <div className="mt-20 text-center">
            <h2 className="text-[22px] font-bold text-navy tracking-[-0.5px] mb-2">
              Still have questions?
            </h2>
            <p className="text-[15px] text-ink-mid mb-6">
              We&rsquo;re a small team and we read every email.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="inline-block px-6 py-3 rounded-lg text-sm font-bold border-[1.5px] border-navy text-navy hover:bg-navy hover:text-white transition-colors"
              >
                Email us
              </a>
              <Link
                href="/sign-up"
                className="inline-block px-6 py-3 rounded-lg text-sm font-bold bg-amber text-white hover:bg-amber-dark transition-colors"
              >
                Start your first capsule
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
