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
// Two query params drive flow / attribution:
//
//   ?occasion=WEDDING — visitor came from /weddings; skip the
//     gift-capsule $9.99 intro (irrelevant for weddings) and
//     pre-select WEDDING inside the flow.
//
//   ?source=enterprise — visitor came from the /enterprise
//     dashboard's "Create a Gift Capsule" CTA; skip the $9.99
//     intro (their org covers the cost) AND attribute the
//     resulting capsule to the org. The API stamps organizationId
//     ONLY when source=enterprise, so org members visiting
//     /capsules/new directly (consumer flow) still get the price
//     card and produce a personally-attributed capsule.
//
// Without source=enterprise, every capsule is treated as personal
// regardless of the creator's org membership. This prevents
// org members' personal gifts from leaking into the org's Stat
// Board.
export default async function NewCapsulePage({
  searchParams,
}: {
  searchParams: Promise<{ occasion?: string; source?: string }>;
}) {
  const sp = await searchParams;
  const initialOccasion = sp.occasion === "WEDDING" ? "WEDDING" : undefined;
  const attribution: "personal" | "enterprise" =
    sp.source === "enterprise" ? "enterprise" : "personal";

  // Resolve the creator's org only for enterprise-attributed flows
  // so the recipient step can offer "Add from database". Personal
  // flows never see the picker even if the user belongs to an org.
  let organizationId: string | null = null;
  if (attribution === "enterprise") {
    const { userId } = auth();
    if (userId) {
      const ctx = await getOrgContextByClerkId(userId);
      organizationId = ctx?.organizationId ?? null;
    }
  }

  return (
    <>
      <CapsuleIntroGate
        initialOccasion={initialOccasion}
        attribution={attribution}
        organizationId={organizationId}
      />
      <Footer />
    </>
  );
}
