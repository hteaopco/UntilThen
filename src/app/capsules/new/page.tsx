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
export default function NewCapsulePage() {
  return (
    <>
      <CapsuleIntroGate />
      <Footer />
    </>
  );
}
