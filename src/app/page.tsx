import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { IntroSplash } from "@/components/landing/IntroSplash";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { Pricing } from "@/components/landing/Pricing";
import { CtaSection } from "@/components/landing/CtaSection";
import { Footer } from "@/components/landing/Footer";
import { ChooseYourVault } from "@/components/marketing/ChooseYourVault";

export default function Home() {
  const { userId } = auth();
  if (userId) redirect("/home");

  return (
    <>
      <IntroSplash />
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <ChooseYourVault />
        <Pricing />
        <CtaSection />
      </main>
      <Footer />
    </>
  );
}
