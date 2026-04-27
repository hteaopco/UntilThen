import Link from "next/link";

/**
 * Shared "A note from us / Why we built untilThen" callout, used
 * above the FAQ accordions on both /weddings/faq and /business/faq
 * (the wedding + enterprise FAQ surfaces).
 *
 * Styled to read like a calm, hand-written aside rather than a
 * marketing block — quiet amber label up top, navy heading, body
 * copy at the same comfortable width as the surrounding intro
 * paragraphs (~640px). Static content; safe to render server-side.
 */
export function FaqBrandNote() {
  return (
    <section
      aria-labelledby="faq-brand-note"
      className="mx-auto max-w-[820px] px-5 lg:px-10 mt-12"
    >
      <div className="rounded-2xl border border-amber/20 bg-white px-6 sm:px-8 py-7 sm:py-9 shadow-[0_4px_18px_rgba(196,122,58,0.06)]">
        <p className="text-[11px] uppercase tracking-[0.16em] font-bold text-amber">
          A note from us
        </p>
        <h2
          id="faq-brand-note"
          className="mt-2 font-extrabold text-navy text-[24px] sm:text-[30px] leading-[1.15] tracking-[-0.5px]"
        >
          Why we built <span className="italic">untilThen</span>
        </h2>
        <div className="mt-4 space-y-4 text-[15px] sm:text-[16px] text-navy/80 leading-[1.65]">
          <p>
            Proverbs 18:21 says the power of life and death are in the tongue.
            The words we speak &mdash; and the ones we never get around to
            saying &mdash; shape the people we love more than we realize.
          </p>
          <p>
            Jesus said that out of the overflow of the heart, the mouth speaks.
            We built{" "}
            <Link
              href="/"
              className="text-amber-dark font-bold hover:underline"
            >
              untilThen
            </Link>{" "}
            because most of us have a full heart and an empty page. We mean to
            say the thing. We plan to write the letter. And then life moves
            fast and the moment passes.
          </p>
          <p>
            untilThen exists to close that gap &mdash; to give the words in
            your heart a place to live until the moment they&rsquo;re needed
            most.
          </p>
        </div>
      </div>
    </section>
  );
}
