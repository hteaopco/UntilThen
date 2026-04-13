import { WaitlistForm } from "@/components/landing/WaitlistForm";

export function CtaSection() {
  return (
    <section id="cta" className="bg-white">
      <div className="mx-auto max-w-[560px] px-6 lg:px-14 py-20 lg:py-28 text-center">
        <h2 className="text-[clamp(34px,5vw,58px)] font-extrabold tracking-[-2px] leading-[1.05] text-navy mb-4">
          They&rsquo;ll read this{" "}
          <span className="font-light italic text-sky">one day.</span>
        </h2>
        <p className="text-base text-ink-mid mb-10">
          Your first letter takes five minutes. Their memories last forever.
        </p>
        <WaitlistForm />
        <p className="text-xs italic text-ink-light mt-3.5">
          No spam. Just early access.
        </p>
        <p className="mt-10 text-[15px] italic text-navy/65">
          Start something they&rsquo;ll keep forever.
        </p>
      </div>
    </section>
  );
}
