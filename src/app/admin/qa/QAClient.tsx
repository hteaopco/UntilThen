"use client";

import { ExternalLink, Eye } from "lucide-react";
import Link from "next/link";

type CapsuleRow = {
  id: string;
  title: string;
  recipientName: string;
  occasionType: string;
  revealDate: string;
  status: string;
  organiser: string;
  contributionCount: number;
  accessToken: string;
};

const STATUS_CLASS: Record<string, string> = {
  DRAFT: "text-ink-light bg-[#f1f5f9]",
  ACTIVE: "text-amber bg-amber-tint",
  SEALED: "text-gold bg-gold-tint",
  REVEALED: "text-green-700 bg-green-50",
};

export function QAClient({ capsules }: { capsules: CapsuleRow[] }) {
  if (capsules.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-navy/10 bg-warm-surface/40 px-5 py-12 text-center">
        <p className="text-sm text-ink-mid">No capsules to test. Create one first.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-ink-mid mb-6">
        Test real capsules end-to-end. Preview the reveal experience, contributor form, and organiser view with actual data.
      </p>

      <div className="space-y-3">
        {capsules.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-navy/[0.08] bg-white px-5 py-4"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <h3 className="text-[15px] font-bold text-navy tracking-[-0.2px]">{c.title}</h3>
                <p className="text-xs text-ink-mid mt-0.5">
                  For {c.recipientName} · by {c.organiser} · {c.contributionCount} contribution{c.contributionCount !== 1 ? "s" : ""}
                </p>
              </div>
              <span className={`shrink-0 text-[9px] uppercase tracking-[0.1em] font-bold px-2 py-0.5 rounded ${STATUS_CLASS[c.status] ?? ""}`}>
                {c.status}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <Link
                href={`/capsules/${c.id}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-navy/15 text-[12px] font-semibold text-navy hover:border-amber/40 hover:text-amber transition-colors"
              >
                <Eye size={13} strokeWidth={1.5} /> Organiser View
                <ExternalLink size={10} strokeWidth={1.5} />
              </Link>

              {c.status !== "DRAFT" && (
                <Link
                  href={`/reveal/${encodeURIComponent(c.accessToken)}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-navy/15 text-[12px] font-semibold text-navy hover:border-amber/40 hover:text-amber transition-colors"
                >
                  <Eye size={13} strokeWidth={1.5} /> Recipient Reveal
                  <ExternalLink size={10} strokeWidth={1.5} />
                </Link>
              )}

              <Link
                href={`/capsules/${c.id}/preview`}
                target="_blank"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-navy/15 text-[12px] font-semibold text-navy hover:border-amber/40 hover:text-amber transition-colors"
              >
                <Eye size={13} strokeWidth={1.5} /> Organiser Preview
                <ExternalLink size={10} strokeWidth={1.5} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
