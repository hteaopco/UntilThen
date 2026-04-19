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
            <div className="rounded-2xl border border-navy/[0.06] bg-[#f5f0ea] overflow-hidden flex flex-col">
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-5">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-tint flex items-center justify-center">
                    <Mic size={18} strokeWidth={1.5} className="text-amber" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold tracking-[0.14em] uppercase text-amber">
                    Voice Notes
                  </span>
                </div>
                <h3 className="text-[16px] sm:text-[20px] lg:text-[24px] font-extrabold text-navy mb-2 sm:mb-3 tracking-[-0.4px] leading-[1.15]">
                  They&rsquo;ll hear your voice again.
                </h3>
                <p className="text-[12px] sm:text-[14px] leading-[1.6] text-ink-mid">
                  Record a message your child will hear years from now &mdash; exactly as you sound today.
                </p>
              </div>
              <div className="mt-auto relative">
                <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[#f5f0ea] to-transparent z-[1]" />
                <div className="px-3 sm:px-5 lg:px-7 pb-4 sm:pb-6 lg:pb-8 pt-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex-1 flex items-end gap-[1.5px] sm:gap-[2px] h-12 sm:h-14 lg:h-16">
                      {[4,7,12,5,9,14,7,11,16,9,6,10,14,8,11,16,7,10,5,8,13,9,6,11,15,8,12,6,10,14,7,11].map((h, i) => (
                        <div key={i} className="flex-1 rounded-full bg-amber/35" style={{ height: `${h * 2.5}%` }} />
                      ))}
                    </div>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber flex items-center justify-center shrink-0 shadow-[0_2px_8px_rgba(196,122,58,0.3)]">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="white" className="ml-0.5">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Multi-Contributor */}
            <div className="rounded-2xl border border-navy/[0.06] bg-[#f5f0ea] overflow-hidden flex flex-col">
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-5">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-tint flex items-center justify-center">
                    <Users size={18} strokeWidth={1.5} className="text-amber" />
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-bold tracking-[0.14em] uppercase text-amber">
                    Multi-Contributor
                  </span>
                </div>
                <h3 className="text-[16px] sm:text-[20px] lg:text-[24px] font-extrabold text-navy mb-2 sm:mb-3 tracking-[-0.4px] leading-[1.15]">
                  It won&rsquo;t just be from you.
                </h3>
                <p className="text-[12px] sm:text-[14px] leading-[1.6] text-ink-mid">
                  Invite grandparents, friends, or anyone who loves them. Every voice in one vault.
                </p>
              </div>
              <div className="mt-auto relative">
                <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[#f5f0ea] to-transparent z-[1]" />
                <div className="px-2 sm:px-4 lg:px-6 pb-3 sm:pb-5 lg:pb-7 pt-4">
                  <Image
                    src="/0FCD9760-2600-4D48-AD47-EE123BD7A8F2.png"
                    alt="Contributors"
                    width={400}
                    height={100}
                    className="w-full h-auto"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── The Reveal — full-width bg image, text overlay ── */}
          <div className="relative rounded-2xl border border-amber/15 overflow-hidden">
            <Image
              src="/E81775DA-BF27-49CE-B22D-84C5135FC04B.png"
              alt="Polaroid photos and sealed envelope"
              fill
              sizes="(max-width: 1024px) 100vw, 1280px"
              className="object-cover object-right"
            />
            <div className="relative z-[1] p-6 sm:p-8 lg:p-10 min-h-[280px] sm:min-h-[320px] flex flex-col justify-center"
              style={{ background: "linear-gradient(to right, #f9ede0 40%, transparent 75%)" }}
            >
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
              <p className="text-[12px] sm:text-[14px] leading-[1.6] text-ink-mid max-w-[280px] sm:max-w-[340px]">
                On the reveal date, their vault unlocks &mdash; letters, photos, and voices delivered one by one.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
