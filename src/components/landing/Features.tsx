import Image from "next/image";

import {
  Bold,
  Camera,
  Italic,
  Lock,
  Mic,
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

          {/* ── Voice Notes + Multi-Contributor — 2 col ──── */}
          <div className="grid gap-4 lg:gap-5 grid-cols-1 sm:grid-cols-2">
            {/* Voice Notes */}
            <div className="rounded-2xl border border-navy/[0.06] bg-[#f5f0ea] overflow-hidden">
              <Image
                src="/IMG_2273.jpeg"
                alt="Voice notes — record a message your child will hear years from now"
                width={800}
                height={900}
                className="w-full h-auto"
              />
            </div>

            {/* Multi-Contributor */}
            <div className="rounded-2xl border border-navy/[0.06] bg-[#f5f0ea] p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-amber-tint flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" x2="19" y1="8" y2="14" />
                    <line x1="22" x2="16" y1="11" y2="11" />
                  </svg>
                </div>
                <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-amber">
                  Multi-Contributor
                </span>
              </div>
              <h3 className="text-[22px] lg:text-[24px] font-extrabold text-navy mb-3 tracking-[-0.4px] leading-[1.15]">
                It won&rsquo;t just be from you.
              </h3>
              <p className="text-[14px] leading-[1.7] text-ink-mid mb-6">
                Invite grandparents, friends, or anyone who loves them. Every voice in one vault.
              </p>
              <div className="mt-auto">
                <Image
                  src="/0FCD9760-2600-4D48-AD47-EE123BD7A8F2.png"
                  alt="Contributors"
                  width={400}
                  height={100}
                  className="w-full max-w-[280px] h-auto"
                />
              </div>
            </div>
          </div>

          {/* ── The Reveal — full width with bg image ──── */}
          <div
            className="relative rounded-2xl border border-amber/15 overflow-hidden"
            style={{ background: "#f9ede0" }}
          >
            <div className="grid lg:grid-cols-2 gap-6 lg:gap-0 items-center">
              <div className="p-8 lg:p-10 relative z-[1]">
                <div className="flex items-center gap-2.5 mb-5">
                  <span className="text-gold" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                    </svg>
                  </span>
                  <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-amber">
                    The Reveal
                  </span>
                </div>
                <h3 className="text-[24px] lg:text-[28px] font-extrabold text-navy mb-3 tracking-[-0.5px] leading-[1.1]">
                  Then one day&hellip;
                  <br />
                  it all opens.
                </h3>
                <p className="text-[14px] leading-[1.7] text-ink-mid max-w-[340px]">
                  On the reveal date, their vault unlocks — letters, photos, and voices delivered one by one.
                </p>
              </div>
              <div className="relative h-[280px] lg:h-full">
                <Image
                  src="/E81775DA-BF27-49CE-B22D-84C5135FC04B.png"
                  alt="Polaroid photos and sealed envelope"
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-contain object-right-bottom lg:object-right"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
