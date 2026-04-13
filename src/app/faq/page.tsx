import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";

export const metadata = {
  title: "FAQ — untilThen",
  description: "Frequently asked questions about untilThen.",
};

export default function FAQPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-white pt-[120px] pb-24 px-6 lg:px-14">
        <div className="mx-auto max-w-[760px]">
          <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-sky mb-3.5">
            FAQ
          </p>
          <h1 className="text-[clamp(32px,4vw,48px)] font-extrabold tracking-[-1.5px] text-navy leading-[1.08] mb-5">
            Frequently Asked Questions
          </h1>
          <p className="text-lg text-ink-mid mb-12">
            Everything you need to know about untilThen.
          </p>
          <div className="rounded-2xl border border-navy/[0.08] bg-[#f8fafc] px-8 py-14 text-center">
            <p className="text-ink-mid italic">
              We&rsquo;re still writing these — check back soon.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
