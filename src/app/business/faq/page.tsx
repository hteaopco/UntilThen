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
  title: "Enterprise FAQ — untilThen",
  description:
    "Quick answers about untilThen Enterprise — billing, roles, capsule creation, and rollout.",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SECTIONS: AccordionSection[] = [
  {
    label: "Enterprise",
    items: [
      {
        question: "What is untilThen Enterprise?",
        answer:
          "untilThen is a private time capsule platform where meaningful messages, photos, and voice notes are sealed and delivered at exactly the right moment.\n\nThe Enterprise Solution gives organizations a single dashboard to create, manage, and send milestone capsules across their team — retirements, work anniversaries, sendoffs, promotions — anything that deserves more than a card.",
      },
      {
        question: "What does untilThen Enterprise cost?",
        answer:
          "Plans start at $299/year for small teams (up to 250 employees), $599/year for growing organizations (251–500 employees), and $999/year for larger companies (500+ employees). All plans include unlimited capsules, scheduled delivery, and priority support.",
      },
      {
        question: "How is billing handled?",
        answer:
          "Once you select a plan, we'll send you an invoice. Upon payment, your dashboard will be set up and delivered to you within 7 days, ready to use.",
      },
      {
        question: "Who can create capsules?",
        answer:
          "Anyone on your organization's roster. Once you upload your team to the dashboard, any member can create and send capsules to anyone else in the organization.",
      },
      {
        question: "What happens when an employee leaves?",
        answer:
          "Recipients keep their capsules — they can store and access them anytime through their personal untilThen profile. If the employee who created an open capsule leaves or is terminated, an admin or owner can transfer ownership of that capsule to another team member.",
      },
      {
        question: "What kind of moments does this work for?",
        answer:
          "Retirements, work anniversaries, sendoffs, going-away gifts, acquisition transitions, founder exits, wedding gifts from teammates, recognition moments, gratitude, graduations — anything that deserves to land at exactly the right moment.",
      },
      {
        question: "How do we get started?",
        answer:
          "Email us at hello@untilthenapp.io and we'll take it from there.",
      },
    ],
  },
];

/**
 * Enterprise-specific FAQ. Focused on procurement-side questions
 * (billing, SSO, transfers, rollout) so a buyer can get to "yes"
 * without sifting through the consumer FAQ.
 */
export default function EnterpriseFaqPage() {
  return (
    <>
      <TopNav hideEnterprisePill />
      <main className="bg-cream min-h-screen pt-10 sm:pt-14 pb-20">
        <section className="mx-auto max-w-[820px] px-5 lg:px-10">
          <Link
            href="/business"
            className="inline-flex items-center gap-1.5 text-[12px] font-bold text-amber-dark hover:text-amber-dark/80 transition-colors"
          >
            <ArrowLeft size={12} strokeWidth={2.25} aria-hidden="true" />
            Back to enterprise
          </Link>
          <h1 className="mt-5 font-extrabold text-navy text-[36px] sm:text-[48px] leading-[1.05] tracking-[-1px]">
            Enterprise
            <br />
            <span className="text-amber italic">questions</span>
          </h1>
          <p className="mt-4 text-[15px] text-navy/70 max-w-[560px] leading-[1.55]">
            Quick answers for buyers and admins. Need more? Email us at{" "}
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
