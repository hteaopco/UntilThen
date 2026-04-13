import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { QuillDivider } from "@/components/landing/QuillDivider";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { PromiseSection } from "@/components/landing/Promise";
import { Features } from "@/components/landing/Features";
import { Testimonial } from "@/components/landing/Testimonial";
import { Pricing } from "@/components/landing/Pricing";
import { CtaSection } from "@/components/landing/CtaSection";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <QuillDivider />
        <HowItWorks />
        <PromiseSection />
        <Features />
        <Testimonial />
        <Pricing />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
