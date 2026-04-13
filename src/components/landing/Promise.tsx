import { QuillSvg } from "@/components/ui/QuillSvg";

function VaultEntry({ title, meta }: { title: string; meta: string }) {
  return (
    <li className="flex items-center gap-4">
      <span className="shrink-0 w-9 h-9 rounded-full bg-cream/[0.06] border border-cream/10 flex items-center justify-center text-xs">
        🔒
      </span>
      <div className="min-w-0">
        <div className="text-sm text-cream/85 truncate">{title}</div>
        <div className="text-xs text-cream/45 mt-0.5">{meta}</div>
      </div>
    </li>
  );
}

export function PromiseSection() {
  return (
    <section className="relative bg-dark text-cream py-24 lg:py-32 overflow-hidden">
      <div
        className="pointer-events-none absolute -bottom-24 -right-16 z-0 hidden lg:block"
        aria-hidden="true"
      >
        <QuillSvg width={360} height={520} color="#e07a4a" opacity={0.08} />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 grid lg:grid-cols-2 gap-16 items-center z-10">
        <div>
          <blockquote className="text-3xl lg:text-[40px] font-semibold leading-[1.25] tracking-[-0.01em]">
            &ldquo;The day your child turns 18, they&rsquo;ll open{" "}
            <span className="font-light italic text-warm">18 years</span> of
            letters from you.&rdquo;
          </blockquote>
          <p className="mt-8 text-cream/60 text-sm tracking-wide">
            — the UntilThen promise
          </p>
        </div>

        <div className="relative bg-cream/[0.04] border border-cream/10 rounded-2xl p-8 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-sm text-cream/70">
            <span aria-hidden="true">🔐</span>
            <span>Ellie&rsquo;s Vault · 34 sealed entries</span>
          </div>

          <div className="mt-8 pb-6 border-b border-cream/10">
            <div className="text-[11px] uppercase tracking-[0.25em] text-warm font-semibold">
              Opens in
            </div>
            <div className="mt-3 text-5xl font-extrabold tracking-[-0.02em]">
              4,891{" "}
              <span className="text-2xl font-light text-cream/60">days</span>
            </div>
            <div className="mt-2 text-sm text-cream/55">
              September 12, 2038 · Ellie turns 18
            </div>
          </div>

          <ul className="mt-6 space-y-4">
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
          </ul>
        </div>
      </div>
    </section>
  );
}
