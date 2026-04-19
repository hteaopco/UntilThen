import Image from "next/image";

import {
  Bold,
  Camera,
  Italic,
  Lock,
  Mic,
  Users,
} from "lucide-react";

function MockBtn({
  children,
  ariaLabel,
}: {
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="w-[26px] h-[26px] bg-white rounded-md flex items-center justify-center text-ink-mid border border-navy/[0.08]"
    >
      {children}
    </button>
  );
}

function MockEditor() {
  return (
    <div className="bg-white rounded-xl p-5 ring-1 ring-white/10 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45),0_4px_12px_-4px_rgba(0,0,0,0.25)]">
      <div className="flex gap-1.5 mb-3 pb-3 border-b border-navy/[0.08]">
        <MockBtn ariaLabel="Bold">
          <Bold size={12} strokeWidth={1.75} />
        </MockBtn>
        <MockBtn ariaLabel="Italic">
          <Italic size={12} strokeWidth={1.75} />
        </MockBtn>
        <MockBtn ariaLabel="Add photo">
          <Camera size={12} strokeWidth={1.75} />
        </MockBtn>
        <MockBtn ariaLabel="Record voice note">
          <Mic size={12} strokeWidth={1.75} />
        </MockBtn>
      </div>
      <div className="text-[13px] leading-[1.8] text-ink-mid">
        Dear Ellie,
        <br />
        <br />
        It&rsquo;s raining and you just fell asleep on my chest. You&rsquo;re
        two weeks old. I want to remember this exact weight.
        <span
          aria-hidden="true"
          className="inline-block w-[2px] h-[14px] bg-amber align-middle ml-px animate-blink"
        />
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-navy/[0.08]">
        <div className="text-[11px] font-bold text-gold flex items-center gap-1.5">
          <Lock size={12} strokeWidth={1.75} aria-hidden="true" />
          Unlocks age 18
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 bg-amber text-white text-[11px] font-bold px-3.5 py-1.5 rounded-md hover:bg-amber-dark transition-colors"
        >
          <Lock size={12} strokeWidth={1.75} aria-hidden="true" />
          Seal
        </button>
      </div>
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="bg-cream">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-14 py-10 lg:py-24">
        <div className="mb-10">
          <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-amber mb-2.5">
            How it works
          </p>
          <h2 className="text-[clamp(28px,3.5vw,44px)] font-extrabold tracking-[-1.5px] text-navy leading-[1.08]">
            Capture what you don&rsquo;t want to{" "}
            <span className="font-light italic text-amber">forget.</span>
          </h2>
        </div>

        <div className="space-y-4 lg:space-y-5">
          {/* ── Writing Experience — dark card ─────────────── */}
          <div
            className="rounded-2xl border border-white/5 p-8 lg:p-10 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center"
            style={{
              background: "linear-gradient(180deg, #3a2e2a 0%, #2c2420 75%)",
            }}
          >
            <div>
              <span className="inline-block text-[10px] font-bold tracking-[0.14em] uppercase px-2.5 py-1 rounded-md bg-amber/20 text-amber-light mb-4">
                Writing Experience
              </span>
              <h3 className="text-[22px] lg:text-[26px] font-extrabold text-white mb-3 tracking-[-0.4px] leading-[1.15]">
                Write it while it&rsquo;s happening.
              </h3>
              <p className="text-[14px] leading-[1.7] text-white/70">
                A quiet space for letters, photos, and AI prompts when you&rsquo;re stuck.
              </p>
            </div>
            <MockEditor />
          </div>

          {/* ── Voice Notes + Multi-Contributor — always 2 col ── */}
          <div className="grid gap-2 sm:gap-3 lg:gap-5 grid-cols-2">
            {/* Voice Notes */}
            <div className="relative rounded-2xl border border-navy/[0.06] bg-[#f5f0ea] overflow-hidden min-h-[280px] sm:min-h-[320px]">
              <div className="relative z-[1] p-4 sm:p-6 lg:p-8 pb-2 sm:pb-3">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-tint flex items-center justify-center">
                    <Mic size={18} strokeWidth={1.5} className="text-amber" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold tracking-[0.14em] uppercase text-amber">
                    Voice Notes
                  </span>
                </div>
                <h3 className="text-[16px] sm:text-[20px] lg:text-[24px] font-extrabold text-navy mb-1.5 sm:mb-2 tracking-[-0.4px] leading-[1.15]">
                  They&rsquo;ll hear your voice again.
                </h3>
                <p className="text-[11px] sm:text-[13px] leading-[1.5] text-ink-mid">
                  Record a message your child will hear years from now &mdash; exactly as you sound today.
                </p>
              </div>
              <Image
                src="/IMG_2289.png"
                alt="Voice waveform"
                width={500}
                height={120}
                className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 right-2 sm:right-3 w-[calc(100%-16px)] sm:w-[calc(100%-24px)] h-auto pointer-events-none opacity-95"
              />
            </div>

            {/* Multi-Contributor */}
            <div className="relative rounded-2xl border border-navy/[0.06] bg-[#f5f0ea] overflow-hidden min-h-[280px] sm:min-h-[320px]">
              <div className="relative z-[1] p-4 sm:p-6 lg:p-8 pb-2 sm:pb-3">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-tint flex items-center justify-center">
                    <Users size={18} strokeWidth={1.5} className="text-amber" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold tracking-[0.14em] uppercase text-amber">
                    Multi-Contributor
                  </span>
                </div>
                <h3 className="text-[16px] sm:text-[20px] lg:text-[24px] font-extrabold text-navy mb-1.5 sm:mb-2 tracking-[-0.4px] leading-[1.15]">
                  It won&rsquo;t just be from you.
                </h3>
                <p className="text-[11px] sm:text-[13px] leading-[1.5] text-ink-mid">
                  Invite grandparents, friends, or anyone who loves them. Every voice in one vault.
                </p>
              </div>
              <Image
                src="/IMG_2284.png"
                alt="Contributors"
                width={500}
                height={120}
                className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 right-2 sm:right-3 w-[calc(100%-16px)] sm:w-[calc(100%-24px)] h-auto pointer-events-none"
              />
            </div>
          </div>

          {/* ── The Reveal — image sets card height ── */}
          <div className="relative rounded-2xl border border-amber/15 overflow-hidden grid grid-cols-[1fr_auto]" style={{ background: "#f9ede0" }}>
            <div className="relative z-[1] p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="text-gold" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                  </svg>
                </span>
                <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-amber">
                  The Reveal
                </span>
              </div>
              <h3 className="text-[20px] sm:text-[24px] lg:text-[28px] font-extrabold text-navy mb-2 sm:mb-3 tracking-[-0.5px] leading-[1.1]">
                Then one day&hellip;
                <br />
                it all opens.
              </h3>
              <p className="text-[12px] sm:text-[14px] leading-[1.6] text-ink-mid">
                On the reveal date, their vault unlocks &mdash; letters, photos, and voices delivered one by one.
              </p>
            </div>
            <div className="self-end pr-2 pb-2 sm:pr-3 sm:pb-3">
              <Image
                src="/IMG_2285.png"
                alt="Polaroid photos and sealed envelope"
                width={400}
                height={500}
                className="w-[140px] sm:w-[180px] lg:w-[240px] h-auto object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
