"use client";

import { AdminHeader } from "@/app/admin/AdminHeader";
import {
  TONE_LABELS,
  TONE_DESCRIPTIONS,
  TONE_EMOJI,
  TONE_HERO,
  TONE_UNLOCK_LINE,
  TONE_INVITE_LINE1,
  TONE_INVITE_LINE2,
  TONE_EDITOR_HINT,
  TONE_THANKYOU,
  TONE_UPSELL,
  toneClosingLine,
  type CapsuleTone,
} from "@/lib/tone";

const TONES: CapsuleTone[] = [
  "CELEBRATION",
  "GRATITUDE",
  "REMEMBRANCE",
  "ENCOURAGEMENT",
  "LOVE",
  "OTHER",
];

export default function AdminTonesPage() {
  return (
    <div className="min-h-screen bg-[#f8f9fb] px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <AdminHeader />

        <h2 className="text-xl font-extrabold text-navy tracking-[-0.3px] mb-1">
          Tone System — All Copy
        </h2>
        <p className="text-sm text-ink-mid mb-8">
          Every piece of tone-specific text across the product, grouped by tone.
        </p>

        <div className="space-y-8">
          {TONES.map((tone) => (
            <div
              key={tone}
              className="rounded-2xl border border-navy/[0.08] bg-white shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-navy/[0.06] bg-[#fafaf8]">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{TONE_EMOJI[tone]}</span>
                  <div>
                    <h3 className="text-lg font-extrabold text-navy tracking-[-0.2px]">
                      {TONE_LABELS[tone]}
                    </h3>
                    <p className="text-xs text-ink-mid">{TONE_DESCRIPTIONS[tone]}</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5 space-y-4 text-sm">
                <Row label="Editor hint (instruction banner)">
                  {TONE_EDITOR_HINT[tone]}
                </Row>
                <Row label="Invite line 1">
                  {TONE_INVITE_LINE1[tone]}
                </Row>
                <Row label="Invite line 2">
                  {TONE_INVITE_LINE2[tone]("they'll")}
                </Row>
                <Row label="Reveal hero">
                  {TONE_HERO[tone]}
                </Row>
                <Row label="Unlock line">
                  {TONE_UNLOCK_LINE[tone]}
                </Row>
                <Row label="Closing line">
                  {toneClosingLine(tone)}
                </Row>
                <Row label="Thank you">
                  {TONE_THANKYOU[tone]("them")}
                </Row>
                <Row label="Upsell headline">
                  {TONE_UPSELL[tone].headline}
                </Row>
                <Row label="Upsell sub">
                  {TONE_UPSELL[tone].sub}
                </Row>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 items-start">
      <span className="text-[11px] font-bold tracking-[0.08em] uppercase text-ink-light pt-0.5">
        {label}
      </span>
      <p className="text-[14px] text-navy leading-[1.5]">{children}</p>
    </div>
  );
}
