import { QuillSvg } from "@/components/ui/QuillSvg";

export function CtaSection() {
  return (
    <section
      id="cta"
      className="relative bg-sand py-28 lg:py-40 overflow-hidden"
    >
      <div
        className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 z-0"
        aria-hidden="true"
      >
        <QuillSvg width={300} height={480} color="#1c1510" opacity={0.06} />
      </div>

      <div className="relative mx-auto max-w-3xl px-6 text-center z-10">
        <h2 className="text-4xl lg:text-6xl font-extrabold text-ink tracking-[-0.02em] leading-[1.05]">
          Start writing to who they&rsquo;ll{" "}
          <span className="font-light italic text-rust">become.</span>
        </h2>
        <p className="mt-6 text-lg text-ink/55">
          Your first letter takes five minutes. Their memories last forever.
        </p>

        <form
          className="mt-10 flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
          action="#"
        >
          <input
            type="email"
            required
            placeholder="your@email.com"
            aria-label="Email address"
            className="flex-1 px-5 py-3.5 rounded-full bg-cream border border-ink/10 text-ink placeholder-ink/40 focus:outline-none focus:border-rust/50 focus:ring-2 focus:ring-rust/20"
          />
          <button
            type="submit"
            className="bg-rust text-cream px-6 py-3.5 rounded-full font-medium hover:opacity-90 transition-opacity"
          >
            Begin writing →
          </button>
        </form>

        <p className="mt-5 text-sm italic text-ink/50">
          Free to start. No credit card required.
        </p>
      </div>
    </section>
  );
}
