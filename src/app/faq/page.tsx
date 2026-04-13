import type { Metadata } from "next";
import Link from "next/link";

import { Footer } from "@/components/landing/Footer";
import { Nav } from "@/components/landing/Nav";
import {
  Accordion,
  type AccordionSection,
} from "@/components/ui/Accordion";

export const metadata: Metadata = {
  title: "FAQ — untilThen",
  description:
    "Everything you need to know about untilThen — the time capsule app for parents.",
};

const SUPPORT_EMAIL = "support@untilthenapp.io";

const SECTIONS: AccordionSection[] = [
  {
    label: "Getting Started",
    items: [
      {
        question: "What is untilThen?",
        answer:
          "untilThen is a time capsule app for parents. You write letters, record voice notes, and upload photos and videos addressed to your child — sealed in a private vault until they reach a milestone you choose, like their 18th birthday.",
      },
      {
        question: "When does my child get access to the vault?",
        answer:
          "Your child has their own account and can log in to see their vault any time. They'll see a countdown to their reveal date and how many sealed memories are waiting for them — but the contents stay completely locked until the reveal date arrives. Think of it like seeing wrapped gifts under the tree but not being able to open them.",
      },
      {
        question: "Can I start before my child is born?",
        answer:
          "Yes — many parents write their first entry before their child arrives. You set the reveal date later once you know their birthday.",
      },
      {
        question: "Can contributors add to the vault?",
        answer:
          "Yes. You invite grandparents, godparents, or other family members by email from your dashboard. Each contributor creates their own account and writes directly into your child's vault. They can only see their own entries — not yours.",
      },
    ],
  },
  {
    label: "The Vault & Security",
    items: [
      {
        question: "Can my child open entries before the reveal date?",
        answer:
          "No. Locked entries are never sent to your child's device — not even hidden. The content doesn't exist on their side until the reveal date passes. There is nothing to find.",
      },
      {
        question: "What if I pass away before the reveal date?",
        answer:
          "During onboarding you nominate a trusted person — a partner, sibling, or close friend. If your account is inactive for 12 or more months, they can request access to transfer the vault. We verify this manually before any transfer happens.",
      },
      {
        question: "Can I edit an entry after sealing it?",
        answer:
          "Yes — until the vault unlocks. Once the reveal date passes and your child opens the vault, entries are permanently locked. We think there's something meaningful about that.",
      },
      {
        question: "Who can see my entries?",
        answer:
          "Only you. Contributors can only see their own entries. Your child cannot see any content until the reveal date. untilThen staff do not access your entries. All content is encrypted at rest.",
      },
    ],
  },
  {
    label: "Pricing & Billing",
    items: [
      {
        question: "How much does untilThen cost?",
        answer:
          "The base plan is $3.99 per month and includes one child vault. Each additional child vault is $1.99 per month. You can also pay annually at $34.99 per year — saving around 27%. All plans start with a 7-day free trial. No credit card required to start.",
      },
      {
        question: "What happens if I cancel my subscription?",
        answer:
          "Your entries are preserved for 12 months after cancellation. We'll email you before deleting anything. You can resubscribe at any time and pick up exactly where you left off.",
      },
      {
        question: "What happens to the vault if I stop paying?",
        answer:
          "The vault enters read-only mode — you can view entries but not add new ones. Your child's reveal date is unaffected. If the reveal date arrives while your account is paused, the vault still unlocks for your child.",
      },
      {
        question: "Is the gift plan auto-renewed?",
        answer:
          "No. The gift plan is a one-time annual payment of $39.99. The recipient chooses whether to continue when it expires — we'll remind them 30 days before with no obligation to renew.",
      },
    ],
  },
  {
    label: "Edge Cases",
    items: [
      {
        question: "What if my child doesn't want to open the vault?",
        answer:
          "That's entirely their choice. The vault stays accessible indefinitely — they can open it the day it unlocks or years later. It never expires.",
      },
      {
        question: "What if I lose access to my account?",
        answer: `Use the standard password reset flow. If you've lost access to your email as well, contact us at ${SUPPORT_EMAIL} and we'll verify your identity before restoring access.`,
      },
      {
        question: "What if my family situation changes?",
        answer:
          "You can update your nominated trustee, change contributor access, or transfer vault ownership at any time from your account settings.",
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
      <Nav />
      <main className="min-h-screen bg-white pt-[120px] pb-20 px-6 lg:px-14">
        <div className="mx-auto max-w-[720px]">
          {/* Header */}
          <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-sky mb-3.5">
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
              className="text-sky hover:text-navy transition-colors font-medium"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>

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
                Email us →
              </a>
              <Link
                href="/#cta"
                className="inline-block px-6 py-3 rounded-lg text-sm font-bold bg-navy text-white hover:bg-navy-mid transition-colors"
              >
                Join the waitlist →
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
