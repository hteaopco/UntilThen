import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Footer } from "@/components/landing/Footer";
import { TopNav } from "@/components/ui/TopNav";
import {
  Accordion,
  type AccordionSection,
} from "@/components/ui/Accordion";

export const metadata: Metadata = {
  title: "Wedding FAQ — untilThen",
  description:
    "Quick answers about wedding capsules — how guests contribute, when the couple receives it, pricing, and more.",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SECTIONS: AccordionSection[] = [
  {
    label: "Wedding Capsules",
    items: [
      {
        question: "What is a wedding capsule?",
        answer:
          "untilThen is a private time capsule platform where meaningful messages, photos, and voice notes are sealed and delivered at exactly the right moment.\n\nA Wedding Capsule is a private time capsule for the couple's wedding day. Guests scan a QR code on an easel sign or table cards and leave a letter, voice note, or photo. Everything is sealed and quietly delivered to both the bride and groom on their first anniversary — a love letter from the day, when they need it most.",
      },
      {
        question: "Who sets one up?",
        answer:
          "Anyone can. The couple themselves, a parent, the maid of honor or best man, a sibling, a wedding planner, or a friend organising the surprise. Whoever creates the capsule manages the dashboard and the printable QR; the couple is just the recipient on reveal day.",
      },
      {
        question: "How does it work for guests?",
        answer:
          "Guests scan the QR code on the easel or table cards, type their name, and leave a message — text, photo, or voice. No app to install, no account to create. Most guests finish in under two minutes and never see what anyone else wrote.",
      },
      {
        question: "When does the couple receive the capsule?",
        answer:
          "By default, the capsule reveals on the couple's first anniversary — the wedding date one year on.",
      },
      {
        question: "How much does it cost?",
        answer:
          "$99.00, one-time. That covers unlimited guest contributions, the QR-driven contribution flow, and reveal-day delivery. No subscription, no per-guest fee.",
      },
      {
        question: "Can guests add photos or voice notes?",
        answer:
          "Yes. Each guest can attach a photo from the day, record a quick voice memo on their phone, or both — alongside their written message.",
      },
      {
        question: "Can the organiser preview what guests have submitted?",
        answer:
          "Yes. The dashboard shows every contribution as it comes in, so whoever set the capsule up can keep an eye on things. If you're setting this up as a surprise, just don't share the dashboard with the couple — they only see everything on reveal day.",
      },
      {
        question: "Can a guest's message be moderated or removed?",
        answer:
          "Every contribution runs through automated moderation on submission. Anything flagged is held for a manual review before it can reach the couple. The organiser can also remove individual contributions from the dashboard at any time before reveal day.",
      },
      {
        question: "What if the wedding date changes?",
        answer:
          "The organiser can edit the reveal date in the capsule's settings — the dashboard accepts any new date up to roughly 600 days from when the capsule was first created. Guests' QR-code link stays the same.",
      },
    ],
  },
];

/**
 * Wedding-specific FAQ. Short and scoped — the global FAQ at
 * /faq covers the product as a whole; this one focuses on the
 * questions wedding visitors actually have on the way to a $99.00
 * decision.
 */
export default function WeddingFaqPage() {
  return (
    <>
      <TopNav />
      <main className="bg-cream min-h-screen pt-10 sm:pt-14 pb-20">
        <section className="mx-auto max-w-[820px] px-5 lg:px-10">
          <Link
            href="/weddings"
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-amber-dark hover:text-amber-dark/80 transition-colors"
          >
            <ArrowLeft size={12} strokeWidth={2.25} aria-hidden="true" />
            Back to weddings
          </Link>
          <h1 className="mt-5 font-extrabold text-navy text-[36px] sm:text-[48px] leading-[1.05] tracking-[-1px]">
            Wedding capsule
            <br />
            <span className="text-amber italic">questions</span>
          </h1>
          <p className="mt-4 text-[15px] text-navy/70 max-w-[560px] leading-[1.55]">
            Quick answers about how wedding capsules work. Need more? Email us
            at{" "}
            <a
              href="mailto:hello@untilthenapp.io"
              className="text-amber-dark font-bold hover:underline"
            >
              hello@untilthenapp.io
            </a>
            .
          </p>
        </section>

        <section className="mx-auto max-w-[820px] px-5 lg:px-10 mt-10">
          <Accordion sections={SECTIONS} showExpandAll />
        </section>
      </main>
      <Footer />
    </>
  );
}
