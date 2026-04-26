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
          "A private time capsule for your wedding day. Guests scan a QR on your easel sign or table cards and leave a letter, voice note, or photo for you. Everything is sealed and quietly delivered to you both on your first anniversary — a love letter from the day, when you need it most.",
      },
      {
        question: "How does it work for guests?",
        answer:
          "Guests scan the QR code on your easel or table cards, type their name, and leave a message — text, photo, or voice. No app to install, no account to create. Most guests finish in under two minutes and never see what anyone else wrote.",
      },
      {
        question: "When do we receive the capsule?",
        answer:
          "By default, the capsule reveals on your one-year anniversary — your wedding date next year. You can pick a different reveal date during setup if you'd rather (within roughly 600 days of creation), but most couples stick with the anniversary because the timing carries the emotional weight.",
      },
      {
        question: "How much does it cost?",
        answer:
          "$99.99, one-time. That covers unlimited guest contributions, the QR-driven contribution flow, and reveal-day delivery. No subscription, no per-guest fee.",
      },
      {
        question: "Can guests add photos or voice notes?",
        answer:
          "Yes. Each guest can attach a photo from the day, record a quick voice memo on their phone, or both — alongside their written message.",
      },
      {
        question: "Can we preview what guests have submitted before the reveal?",
        answer:
          "Yes. From your wedding dashboard you can see every contribution as it comes in. You won't see them on reveal day for the first time — but the experience of watching them roll in is part of the fun.",
      },
      {
        question: "Can a guest's message be moderated or removed?",
        answer:
          "Every contribution runs through automated moderation on submission. Anything flagged is held for a manual review before it can reach you. You can also remove individual contributions from your dashboard at any time before reveal day.",
      },
      {
        question: "What happens if our wedding date changes?",
        answer:
          "Edit the reveal date in your wedding capsule's settings — the dashboard accepts any new date up to roughly 600 days from when you first created the capsule. Guests' QR-code link stays the same.",
      },
    ],
  },
];

/**
 * Wedding-specific FAQ. Short and scoped — the global FAQ at
 * /faq covers the product as a whole; this one focuses on the
 * questions wedding visitors actually have on the way to a $99.99
 * decision.
 */
export default function WeddingFaqPage() {
  return (
    <>
      <TopNav hideEnterprisePill />
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
          <Accordion sections={SECTIONS} />
        </section>
      </main>
      <Footer />
    </>
  );
}
