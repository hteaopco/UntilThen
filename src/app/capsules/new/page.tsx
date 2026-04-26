import { Footer } from "@/components/landing/Footer";

import { CapsuleIntroGate } from "./CapsuleIntroGate";

export const metadata = {
  title: "Create a Gift Capsule — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// The page itself is public — visitors from the landing page's
// pricing CTA (and the dashboard Gift Capsules chip) land on the
// intro card first. Clicking "Create Gift Capsule" swaps the
// intro for the existing CapsuleCreationFlow wizard client-side,
// so the URL stays /capsules/new throughout.
//
// /weddings forwards visitors here with ?occasion=WEDDING; we
// read that and skip the gift-capsule pricing intro (irrelevant
// for weddings) and pre-select WEDDING inside the flow.
export default async function NewCapsulePage({
  searchParams,
}: {
  searchParams: Promise<{ occasion?: string }>;
}) {
  const sp = await searchParams;
  const initialOccasion = sp.occasion === "WEDDING" ? "WEDDING" : undefined;

  return (
    <>
      <CapsuleIntroGate initialOccasion={initialOccasion} />
      <Footer />
    </>
  );
}
