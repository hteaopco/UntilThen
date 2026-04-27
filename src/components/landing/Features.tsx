import Image from "next/image";

import { Mic, Pencil } from "lucide-react";

export function Features() {
  return (
    <section id="features" className="bg-cream">
      <div className="mx-auto max-w-[1080px] px-6 lg:px-14 pt-3 lg:pt-7 pb-0">
        {/* Mobile: Voice + Keep Writing side-by-side, Reveal below.
            Desktop (lg+): 2-col grid — left column stacks Voice
            over Keep Writing, right column is the Reveal card at
            matching height via items-stretch. */}
        <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-5 lg:items-stretch">
          <div className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-1 lg:gap-5">
            {/* Voice Notes */}
            <div className="relative rounded-2xl border border-amber/10 overflow-hidden" style={{ background: "#fef0dc" }}>
              <div className="relative z-[1] p-4 sm:p-6 lg:p-8">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-tint flex items-center justify-center">
                    <Mic size={18} strokeWidth={1.5} className="text-amber" />
                  </div>
                  <span className="text-[12px] font-bold tracking-[0.14em] uppercase text-amber">
                    Voice Notes
                  </span>
                </div>
                <h3 className="text-[16px] sm:text-[24px] lg:text-[28px] font-extrabold text-navy mb-1.5 sm:mb-2 tracking-[-0.4px] leading-[1.06]">
                  They&rsquo;ll hear your voice again.
                </h3>
                <p className="text-[14px] sm:text-[15px] leading-[1.55] text-ink-mid">
                  Record something they&rsquo;ll listen to again and again.
                </p>
              </div>
            </div>

            {/* Multi-Contributor */}
            <div className="relative rounded-2xl border border-amber/10 overflow-hidden" style={{ background: "#fef0dc" }}>
              <div className="relative z-[1] p-4 sm:p-6 lg:p-8">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-tint flex items-center justify-center">
                    <Pencil size={18} strokeWidth={1.5} className="text-amber" />
                  </div>
                  <span className="text-[12px] font-bold tracking-[0.14em] uppercase text-amber">
                    Keep Writing
                  </span>
                </div>
                <h3 className="text-[16px] sm:text-[24px] lg:text-[28px] font-extrabold text-navy mb-1.5 sm:mb-2 tracking-[-0.4px] leading-[1.06]">
                  Come back to it over time.
                </h3>
                <p className="text-[14px] sm:text-[15px] leading-[1.55] text-ink-mid">
                  Capture the moments you don&rsquo;t want to lose.
                </p>
              </div>
            </div>
          </div>

          {/* ── The Reveal — image sets card height on mobile,
              grid row-height sets it on desktop ── */}
          <div className="relative rounded-2xl border border-amber/15 overflow-hidden grid grid-cols-[1fr_auto] lg:h-full" style={{ background: "#fef0dc" }}>
            <div className="relative z-[2] p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="text-gold" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                  </svg>
                </span>
                <span className="text-[12px] font-bold tracking-[0.14em] uppercase text-amber">
                  The Reveal
                </span>
              </div>
              <h3 className="text-[16px] sm:text-[24px] lg:text-[28px] font-extrabold text-navy mb-2 sm:mb-3 tracking-[-0.5px] leading-[1.1]">
                <span className="whitespace-nowrap">Then one day&hellip;</span>
                <br />
                it all opens.
              </h3>
              <p className="text-[14px] sm:text-[15px] leading-[1.6] text-ink-mid">
                On reveal date, messages, photos and voices come to life &mdash; one by one.
              </p>
            </div>
            <div className="self-end pr-1 pb-1 sm:pr-2 sm:pb-2 -ml-4">
              <Image
                src="/landing-birthday-polaroid.png"
                alt="Polaroid photos and sealed envelope"
                width={400}
                height={500}
                className="w-[184px] sm:w-[230px] lg:w-[300px] h-auto object-contain"
                style={{
                  filter: "drop-shadow(0 8px 16px rgba(0,0,0,0.06))",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
