import { WaitlistForm } from "@/components/landing/WaitlistForm";

export function CtaSection() {
  return (
    <section id="cta" className="bg-white">
      <div className="mx-auto max-w-[560px] px-6 lg:px-14 py-20 lg:py-28 text-center">
        <h2 className="text-[clamp(34px,5vw,58px)] font-extrabold tracking-[-2px] leading-[1.05] text-navy mb-4">
          Start writing to
          <br />
          who they&rsquo;ll{" "}
          <span className="font-light italic text-sky">become.</span>
        </h2>
        <p className="text-base text-ink-mid mb-10">
          Your first letter takes five minutes. Their memories last forever.
        </p>
        <WaitlistForm />
        <p className="text-xs italic text-ink-light mt-3.5">
          Free to join. No spam, ever.
        </p>
      </div>
    </section>
  );
}
