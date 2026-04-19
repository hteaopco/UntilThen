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
        <div
          aria-hidden="true"
          className="inline-flex items-center gap-1.5 bg-amber text-white text-[11px] font-bold px-3.5 py-1.5 rounded-md pointer-events-none select-none"
        >
          <Lock size={12} strokeWidth={1.75} />
          Seal
        </div>
      </div>
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="bg-cream">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-14 pt-3 lg:pt-7 pb-10 lg:pb-24">
        <div className="space-y-4 lg:space-y-5">
          <div className="grid gap-2 sm:gap-3 lg:gap-5 grid-cols-2">
            {/* Voice Notes */}
            <div className="relative rounded-2xl border border-amber/10 overflow-hidden min-h-[240px] sm:min-h-[280px]" style={{ background: "#fef0dc" }}>
              <div className="relative z-[1] p-4 sm:p-6 lg:p-8 pb-[36px] sm:pb-[44px]">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-tint flex items-center justify-center">
                    <Mic size={18} strokeWidth={1.5} className="text-amber" />
                  </div>
                  <span className="text-[11px] sm:text-[12px] font-bold tracking-[0.14em] uppercase text-amber">
                    Voice Notes
                  </span>
                </div>
                <h3 className="text-[16px] sm:text-[20px] lg:text-[24px] font-extrabold text-navy mb-1.5 sm:mb-2 tracking-[-0.4px] leading-[1.06]">
                  They&rsquo;ll hear your voice again.
                </h3>
                <p className="text-[13px] sm:text-[14px] leading-[1.55] text-ink-mid">
                  Record a message your child will hear years from now &mdash; exactly as you sound today.
                </p>
              </div>
              <Image
                src="/IMG_2289.png"
                alt="Voice waveform"
                width={500}
                height={120}
                className="absolute -bottom-1 sm:bottom-0 left-0 right-0 w-full h-auto pointer-events-none"
                style={{ transform: "scale(1.03)", transformOrigin: "bottom center" }}
              />
            </div>

            {/* Multi-Contributor */}
            <div className="relative rounded-2xl border border-amber/10 overflow-hidden min-h-[240px] sm:min-h-[280px]" style={{ background: "#fef0dc" }}>
              <div className="relative z-[1] p-4 sm:p-6 lg:p-8 pb-[36px] sm:pb-[44px]">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-tint flex items-center justify-center">
                    <Users size={18} strokeWidth={1.5} className="text-amber" />
                  </div>
                  <span className="text-[11px] sm:text-[12px] font-bold tracking-[0.14em] uppercase text-amber">
                    Multi-Contributor
                  </span>
                </div>
                <h3 className="text-[16px] sm:text-[20px] lg:text-[24px] font-extrabold text-navy mb-1.5 sm:mb-2 tracking-[-0.4px] leading-[1.06]">
                  It won&rsquo;t just be from you.
                </h3>
                <p className="text-[13px] sm:text-[14px] leading-[1.55] text-ink-mid">
                  Invite grandparents, friends, or anyone who loves them. Every voice in one vault.
                </p>
              </div>
              <Image
                src="/IMG_2324.png"
                alt="Contributors"
                width={500}
                height={120}
                className="absolute -bottom-1 sm:bottom-0 left-0 right-0 w-full h-auto pointer-events-none"
                style={{ transform: "scale(1.03)", transformOrigin: "bottom center" }}
              />
            </div>
          </div>

          {/* ── The Reveal — image sets card height ── */}
          <div className="relative rounded-2xl border border-amber/15 overflow-hidden grid grid-cols-[1fr_auto]" style={{ background: "#fef0dc" }}>
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
                On the reveal date, their vault unlocks &mdash; letters, photos, and voices delivered one by one.
              </p>
            </div>
            <div className="self-end pr-1 pb-1 sm:pr-2 sm:pb-2 -ml-4">
              <Image
                src="/44D3F619-120F-405B-9A06-4893EF64D33C.png"
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

          {/* ── Writing Experience — glassmorphism dark card ── */}
          <div
            className="relative rounded-3xl p-8 lg:p-10 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center overflow-hidden"
            style={{
              background: "linear-gradient(160deg, #3d2e28 0%, #2a1f1a 40%, #1e1612 100%)",
            }}
          >
            <div
              className="absolute inset-0 rounded-3xl pointer-events-none"
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.2)",
              }}
            />
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
              <div className="absolute top-[15%] left-[8%] w-1 h-1 bg-gold/60 rounded-full animate-pulse" style={{ animationDuration: "3s" }} />
              <div className="absolute top-[70%] left-[4%] w-1.5 h-1.5 bg-amber/40 rounded-full animate-pulse" style={{ animationDuration: "4s", animationDelay: "1s" }} />
              <div className="absolute bottom-[12%] left-[12%] w-1 h-1 bg-gold/50 rounded-full animate-pulse" style={{ animationDuration: "3.5s", animationDelay: "0.5s" }} />
              <div className="absolute top-[25%] right-[45%] w-0.5 h-0.5 bg-white/30 rounded-full animate-pulse" style={{ animationDuration: "2.5s", animationDelay: "1.5s" }} />
            </div>
            <div
              className="absolute right-0 bottom-0 w-[60%] h-[70%] pointer-events-none"
              style={{
                background: "radial-gradient(ellipse at 80% 80%, rgba(201,168,76,0.08) 0%, transparent 70%)",
              }}
            />
            <div className="relative z-[1]">
              <span className="inline-block text-[10px] font-bold tracking-[0.14em] uppercase px-3 py-1.5 rounded-lg mb-4"
                style={{ background: "rgba(201,168,76,0.15)", color: "#e2c47a" }}>
                Writing Experience
              </span>
              <h3 className="text-[22px] lg:text-[26px] font-extrabold text-white mb-3 tracking-[-0.4px] leading-[1.15]">
                Write it while it&rsquo;s happening.
              </h3>
              <p className="text-[14px] leading-[1.7] text-white/60">
                A quiet space for letters, photos, and AI prompts when you&rsquo;re stuck.
              </p>
            </div>
            <div className="relative z-[1]">
              <MockEditor />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
