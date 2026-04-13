function VaultEntry({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="px-3 py-2.5 bg-white/[0.04] border border-white/[0.06] rounded-lg">
      <div className="text-xs italic text-white/45">{title}</div>
      <div className="text-[10px] uppercase tracking-[0.06em] font-semibold text-white/20 mt-0.5">
        {meta}
      </div>
    </div>
  );
}

export function PromiseSection() {
  return (
    <section className="relative bg-navy overflow-hidden py-20 lg:py-28">
      {/* Top-right blue glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-[200px] -right-[200px] w-[600px] h-[600px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(74,158,221,0.1) 0%, transparent 70%)",
        }}
      />
      {/* Bottom-left gold glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[100px] -left-[100px] w-[400px] h-[400px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(201,168,76,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-[1] mx-auto max-w-[1280px] px-6 lg:px-14 grid lg:grid-cols-2 gap-10 lg:gap-20 items-center">
        <div>
          <blockquote className="text-[clamp(26px,3vw,42px)] font-extrabold leading-[1.15] tracking-[-1.5px] text-white">
            &ldquo;The day your child turns 18, they&rsquo;ll open{" "}
            <em className="not-italic font-light italic text-sky-light">
              18 years
            </em>{" "}
            of letters from you.&rdquo;
          </blockquote>
          <p className="text-[13px] italic text-white/30 mt-5">
            — the untilThen promise
          </p>
        </div>

        <div>
          <p className="text-[17px] leading-[1.8] text-white/55 font-light mb-8">
            Most memories are captured for now. untilThen is built for then —
            the moment your grown child discovers who you were when they were
            small.
          </p>

          <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl p-6">
            <div className="flex items-center gap-2.5 mb-4 pb-3.5 border-b border-white/[0.06]">
              <div
                className="w-8 h-8 bg-sky rounded-lg flex items-center justify-center text-sm shrink-0"
                aria-hidden="true"
              >
                🔐
              </div>
              <div>
                <div className="text-sm font-bold text-white">
                  Ellie&rsquo;s Vault
                </div>
                <div className="text-[11px] text-white/30 mt-px">
                  34 sealed entries
                </div>
              </div>
            </div>

            <div className="text-center py-3.5">
              <div className="text-[10px] uppercase tracking-[0.12em] font-semibold text-white/30 mb-1">
                Opens in
              </div>
              <div className="text-4xl font-extrabold text-gold tracking-[-2px]">
                4,891 days
              </div>
              <div className="text-[11px] italic text-white/20 mt-1">
                September 12, 2038 · Ellie turns 18
              </div>
            </div>

            <div className="flex flex-col gap-1.5 mt-3.5">
              <VaultEntry
                title="The night before your first day of school"
                meta="Aug 2025 · Letter"
              />
              <VaultEntry
                title="A voice note from Dad — 2:34"
                meta="Jan 2026 · Voice note"
              />
              <VaultEntry
                title="For when you fall in love"
                meta="Mar 2026 · Letter + photo"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
