import { IntroSplash } from "@/components/landing/IntroSplash";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { Divider } from "@/components/landing/Divider";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { Pricing } from "@/components/landing/Pricing";
import { CtaSection } from "@/components/landing/CtaSection";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <IntroSplash />
      <Nav />
      <main>
        <Hero />
        <Divider />
        <HowItWorks />
        <Features />
        <Pricing />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
