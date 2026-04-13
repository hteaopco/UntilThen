import { WaitlistForm } from "@/components/landing/WaitlistForm";

export function CtaSection() {
  return (
    <section id="cta" className="bg-warm-surface overflow-hidden">
      <div className="px-6 lg:px-14 py-20 lg:py-28 text-center">
        <h2 className="text-[clamp(22px,5.5vw,52px)] font-extrabold tracking-[-0.03em] leading-[1.05] text-navy mb-6 whitespace-nowrap">
          They&rsquo;ll read this{" "}
          <span className="font-light italic text-amber">one day.</span>
        </h2>
        <div className="mx-auto max-w-[520px]">
          <p className="text-base text-ink-mid mb-10">
            Your first letter takes five minutes. Their memories last forever.
          </p>
          <WaitlistForm />
          <p className="text-xs italic text-ink-light mt-3.5">
            No spam. Just early access.
          </p>
        </div>
        <p className="mt-10 text-[15px] italic text-navy/65">
          Start something they&rsquo;ll keep forever.
        </p>
      </div>
    </section>
  );
}
