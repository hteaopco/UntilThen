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
          "A private time-capsule platform for organisations — a single roster, centralised billing, and one dashboard for sending milestone capsules to your team. Retirements, decade anniversaries, sendoffs, weddings — anything that deserves more than a card.",
      },
      {
        question: "How is this different from individual capsules?",
        answer:
          "Same capsule product underneath, with org-level scaffolding around it. You add team members to an org, assign roles (Owner, Admin, Member), and every capsule a member creates is attributed to your org. One bill, one dashboard, no shared logins.",
      },
      {
        question: "How is billing handled?",
        answer:
          "Centralised. Capsules created by anyone in your org are charged to a single card on file — no expense reports, no individual reimbursements. Volume pricing is available for larger rollouts; reach out to sales for a quote.",
      },
      {
        question: "Who can create capsules in our org?",
        answer:
          "Any active member can create a capsule. Owners and Admins additionally manage the roster — invite new members, change roles, transfer capsules when someone leaves. Members can't see other members' personal capsules; the org link is purely back-office attribution.",
      },
      {
        question: "What happens to capsules when an employee leaves?",
        answer:
          "Owners can transfer capsules from a departing member to another teammate before offboarding. The capsule and its contributions move with the assignment; the recipient flow doesn't change. We don't auto-delete on offboarding — capsules stay on the user's personal account if not transferred.",
      },
      {
        question: "Is there SSO?",
        answer:
          "SSO via Clerk is available on the enterprise tier. We can also accommodate SCIM for larger rollouts. Get in touch and we'll scope it with you.",
      },
      {
        question: "What kinds of moments does this work for?",
        answer:
          "Retirements (40-year career, 40 voices on it), 10-year work anniversaries, going-away gifts, sendoffs after acquisitions, founder exits, wedding gifts from teammates. Anything that deserves to land at exactly the right moment.",
      },
      {
        question: "How do we get started?",
        answer:
          "Email hello@untilthenapp.io and tell us roughly how many seats and which moments you're planning to cover. We'll provision your org, set up centralised billing, and walk a designated admin through inviting the team.",
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
          <Accordion sections={SECTIONS} />
        </section>
      </main>
      <Footer />
    </>
  );
}
