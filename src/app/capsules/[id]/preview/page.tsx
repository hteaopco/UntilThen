import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { findOwnedCapsule } from "@/lib/capsules";
import { r2IsConfigured, signGetUrl } from "@/lib/r2";

import { PreviewExperience, type PreviewContribution } from "./PreviewExperience";

export const metadata = {
  title: "Preview capsule — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Organiser-only preview of what the recipient will experience on
 * reveal day. Loads the capsule + approved contributions and hands
 * them to a client component that plays the 6-scene preview.
 *
 * Distinct from /capsule/[id]/open — that route is the actual
 * recipient reveal (public, token-gated). This route is private,
 * gated by Clerk ownership, and is a conversion surface: after the
 * organiser feels the payoff, the final scene CTAs back into the
 * payment flow.
 */
export default async function CapsulePreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const owned = await findOwnedCapsule(userId, id);
  if (!owned.ok) redirect("/dashboard");

  const { prisma } = await import("@/lib/prisma");
  const capsule = await prisma.memoryCapsule.findUnique({
    where: { id },
    include: {
      contributions: {
        where: { approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] } },
        orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!capsule) redirect("/dashboard");

  // Resolve R2 signed URLs for any media attachments so the preview
  // can render photos / voice notes / videos in the reveal scene.
  // Skips gracefully when R2 isn't configured (local dev without
  // credentials) — contributions just render without media instead
  // of erroring.
  const r2 = r2IsConfigured();
  const contributions: PreviewContribution[] = await Promise.all(
    capsule.contributions.map(async (c) => {
      const media =
        r2 && c.mediaUrls.length > 0
          ? await Promise.all(
              c.mediaUrls.map(async (key, i) => ({
                url: await signGetUrl(key),
                kind: (c.mediaTypes[i] ?? "photo") as
                  | "photo"
                  | "voice"
                  | "video",
              })),
            )
          : [];
      return {
        id: c.id,
        authorName: c.authorName,
        type: c.type,
        title: c.title,
        body: c.body,
        media,
      };
    }),
  );

  return (
    <PreviewExperience
      capsule={{
        id: capsule.id,
        title: capsule.title,
        recipientName: capsule.recipientName,
        occasionType: capsule.occasionType,
        revealDate: capsule.revealDate.toISOString(),
        isPaid: capsule.isPaid,
        status: capsule.status,
      }}
      contributions={contributions}
    />
  );
}
