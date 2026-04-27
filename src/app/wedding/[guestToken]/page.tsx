import { notFound } from "next/navigation";

import { assetVersion } from "@/lib/asset-version";
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
  searchParams,
}: {
  params: Promise<{ guestToken: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { guestToken } = await params;
  const sp = await searchParams;
  const editToken =
    typeof sp.edit === "string" && sp.edit.trim() ? sp.edit.trim() : null;
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

  // Edit-mode bootstrap. When the URL carries ?edit=<editToken>,
  // resolve the contribution server-side and hand it to the form
  // as initial state. Token must belong to the same capsule —
  // otherwise we silently fall back to the normal create flow,
  // no 404 (so a stale or wrong token doesn't break the page).
  let editInitial: {
    contributionId: string;
    authorName: string;
    body: string | null;
    mediaUrls: string[];
    mediaTypes: string[];
  } | null = null;
  if (editToken) {
    const row = await prisma.capsuleContribution.findUnique({
      where: { editToken },
      select: {
        id: true,
        capsuleId: true,
        authorName: true,
        body: true,
        mediaUrls: true,
        mediaTypes: true,
      },
    });
    if (row && row.capsuleId === capsule.id) {
      editInitial = {
        contributionId: row.id,
        authorName: row.authorName,
        body: row.body,
        mediaUrls: row.mediaUrls,
        mediaTypes: row.mediaTypes,
      };
    }
  }

  // Cache-bust queries — keyed off the file's mtime so any
  // re-upload of /public/Card.png or /public/Roses.png busts
  // the browser cache automatically on next deploy.
  const assetVersions = {
    card: assetVersion("Card.png"),
    roses: assetVersion("Roses.png"),
  };

  return (
    <WeddingGuestForm
      guestToken={guestToken}
      assetVersions={assetVersions}
      editInitial={editInitial}
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
