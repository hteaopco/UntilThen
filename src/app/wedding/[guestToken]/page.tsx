import { notFound } from "next/navigation";

import { effectiveStatus } from "@/lib/capsules";

import { WeddingGuestForm } from "./WeddingGuestForm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Leave a memory — untilThen",
  description:
    "Leave a letter, a voice note, or a photo for the couple. Sealed and revealed on their first anniversary.",
};

/**
 * Public wedding-guest landing reached by scanning the QR on the
 * easel sign or table card. Resolves the open guest token and
 * hands the capsule's couple names + reveal date to the client
 * form, which runs the splash → ribbon-card → editor → thank-you
 * sequence.
 *
 * No auth — this is the public face of the wedding capsule.
 * SEALED / REVEALED / DRAFT capsules render a friendly
 * placeholder instead of letting guests submit into a closed
 * capsule.
 */
export default async function WeddingGuestPage({
  params,
}: {
  params: Promise<{ guestToken: string }>;
}) {
  const { guestToken } = await params;
  if (!guestToken) notFound();
  if (!process.env.DATABASE_URL) notFound();

  const { prisma } = await import("@/lib/prisma");
  const capsule = await prisma.memoryCapsule.findUnique({
    where: { guestToken },
    select: {
      id: true,
      title: true,
      recipientName: true,
      occasionType: true,
      revealDate: true,
      contributorDeadline: true,
      status: true,
      contributionsClosed: true,
      firstOpenedAt: true,
      isPaid: true,
    },
  });
  if (!capsule || capsule.occasionType !== "WEDDING") notFound();

  const status = effectiveStatus(capsule);

  return (
    <WeddingGuestForm
      guestToken={guestToken}
      capsule={{
        title: capsule.title,
        recipientName: capsule.recipientName,
        revealDate: capsule.revealDate.toISOString(),
        contributorDeadline:
          capsule.contributorDeadline?.toISOString() ?? null,
        isOpenForContributions:
          capsule.status === "ACTIVE" && status === "ACTIVE",
        closedReason:
          capsule.status === "DRAFT"
            ? "draft"
            : status === "REVEALED"
              ? "revealed"
              : status === "SEALED"
                ? "sealed"
                : null,
      }}
    />
  );
}
