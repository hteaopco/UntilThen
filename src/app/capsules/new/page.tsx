import { auth } from "@clerk/nextjs/server";

import { Footer } from "@/components/landing/Footer";
import { getOrgContextByClerkId } from "@/lib/orgs";

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
//
// Org members (enterprise channel) also skip the intro because
// the price card pitches $9.99 — wrong for them since their
// organisation covers the cost. They land straight in the
// wizard and the resulting capsule is auto-stamped with
// organizationId server-side in /api/capsules.
export default async function NewCapsulePage({
  searchParams,
}: {
  searchParams: Promise<{ occasion?: string }>;
}) {
  const sp = await searchParams;
  const initialOccasion = sp.occasion === "WEDDING" ? "WEDDING" : undefined;

  const { userId } = auth();
  const orgCtx = userId ? await getOrgContextByClerkId(userId) : null;
  const skipIntro = Boolean(orgCtx);

  return (
    <>
      <CapsuleIntroGate
        initialOccasion={initialOccasion}
        skipIntro={skipIntro}
      />
      <Footer />
    </>
  );
}
