import Link from "next/link";

export function CtaSection() {
  return (
    <section id="cta" className="bg-warm-surface overflow-hidden">
      <div className="px-6 lg:px-14 py-20 lg:py-28 text-center">
        <h2 className="text-[clamp(28px,5vw,52px)] font-extrabold tracking-[-0.03em] leading-[1.05] text-navy mb-5">
          Start writing for them{" "}
          <span className="font-light italic text-amber">today.</span>
        </h2>
        <p className="text-base lg:text-[17px] text-ink-mid max-w-[520px] mx-auto mb-10">
          It takes five minutes. They&rsquo;ll have it forever.
        </p>
        <Link
          href="/sign-up"
          className="inline-block bg-amber text-white px-8 py-4 rounded-lg text-[16px] font-bold hover:bg-amber-dark transition-colors"
        >
          Start your first capsule &rarr;
        </Link>
      </div>
    </section>
  );
}
