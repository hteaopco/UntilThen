import { QuillSvg } from "@/components/ui/QuillSvg";

function Stat({ big, label }: { big: string; label: string }) {
  return (
    <div>
      <div className="text-4xl font-extrabold text-ink tracking-[-0.02em]">{big}</div>
      <div className="mt-2 text-xs text-ink/55 leading-relaxed max-w-[160px]">
        {label}
      </div>
    </div>
  );
}

function LetterCard({
  top,
  left,
  zIndex,
  floatClass,
  to,
  title,
  preview,
  lock,
}: {
  top: number;
  left: number;
  zIndex: number;
  floatClass: string;
  to: string;
  title: string;
  preview: string;
  lock: string;
}) {
  return (
    <div
      className={`absolute w-[340px] bg-white rounded-xl border border-ink/[0.05] p-6 ${floatClass}`}
      style={{
        top,
        left,
        zIndex,
        boxShadow:
          "0 30px 60px -20px rgba(28,21,16,0.2), 0 10px 24px -12px rgba(28,21,16,0.12)",
      }}
    >
      <div className="text-[11px] uppercase tracking-[0.25em] text-rust font-semibold">
        {to}
      </div>
      <h3 className="mt-3 text-lg font-semibold text-ink leading-snug">
        {title}
      </h3>
      <p className="mt-3 text-sm text-ink/55 leading-relaxed">{preview}</p>
      <div className="mt-5 pt-4 border-t border-ink/[0.06] text-[11px] text-ink/45 flex items-center gap-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-rust/70" />
        {lock}
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section
      id="top"
      className="relative pt-32 pb-24 lg:pt-40 lg:pb-32 overflow-hidden"
    >
      <div
        className="pointer-events-none hidden lg:block absolute right-[-120px] top-1/2 z-0 animate-quillFloat"
        aria-hidden="true"
      >
        <QuillSvg width={480} height={680} color="#1c1510" opacity={0.07} />
      </div>

      <div className="relative mx-auto max-w-6xl px-6 grid lg:grid-cols-2 gap-16 items-center z-10">
        <div className="flex flex-col gap-7">
          <p
            className="animate-fadeUp text-[11px] uppercase tracking-[0.25em] text-rust font-semibold flex items-center gap-3"
            style={{ animationDelay: "0.1s" }}
          >
            <span className="w-8 h-px bg-rust/60" />
            Letters sealed in time
          </p>

          <h1
            className="animate-fadeUp text-[48px] leading-[1.05] md:text-[64px] lg:text-[80px] font-extrabold text-ink tracking-[-0.03em]"
            style={{ animationDelay: "0.2s" }}
          >
            Write to who they&rsquo;ll{" "}
            <span className="font-light italic text-rust">become.</span>
          </h1>

          <p
            className="animate-fadeUp text-lg text-ink/55 max-w-xl leading-relaxed"
            style={{ animationDelay: "0.3s" }}
          >
            Seal letters, voice notes & memories in a vault your child unlocks
            when they&rsquo;re ready — on their 13th birthday, their 18th, or
            the day they fall in love.
          </p>

          <div
            className="animate-fadeUp flex flex-wrap items-center gap-6"
            style={{ animationDelay: "0.4s" }}
          >
            <a
              href="#cta"
              className="bg-rust text-cream px-7 py-3.5 rounded-full font-medium hover:opacity-90 transition-opacity"
            >
              Begin your first letter →
            </a>
            <a
              href="#how"
              className="text-ink/70 hover:text-ink underline underline-offset-4 decoration-ink/20"
            >
              See how it works ↓
            </a>
          </div>

          <div
            className="animate-fadeUp h-px bg-ink/10 mt-4"
            style={{ animationDelay: "0.5s" }}
          />

          <div
            className="animate-fadeUp grid grid-cols-3 gap-6"
            style={{ animationDelay: "0.55s" }}
          >
            <Stat big="18" label="years of letters, opened at once" />
            <Stat big="∞" label="entries on paid plans" />
            <Stat big="1" label="unforgettable reveal moment" />
          </div>
        </div>

        <div
          className="relative h-[560px] hidden lg:block animate-fadeUp"
          style={{ animationDelay: "0.5s" }}
        >
          <LetterCard
            zIndex={1}
            top={140}
            left={100}
            floatClass="animate-cardFloatC"
            to="Always"
            title="The day we brought you home"
            preview="📷 47 photos · with a letter"
            lock="Sealed"
          />
          <LetterCard
            zIndex={2}
            top={70}
            left={50}
            floatClass="animate-cardFloatB"
            to="For when you fall in love"
            title="A voice note from Dad"
            preview="🎙 2:34 · recorded on a rainy Sunday"
            lock="Sealed"
          />
          <LetterCard
            zIndex={3}
            top={0}
            left={0}
            floatClass="animate-cardFloatA"
            to="To Ellie, age 18"
            title="The night before your first day of school"
            preview="You picked the backpack with tiny stars on it…"
            lock="Unlocks Sept 2038"
          />
        </div>
      </div>
    </section>
  );
}
