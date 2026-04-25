import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import type { Attachment } from "@/components/editor/MediaAttachments";
import { Footer } from "@/components/landing/Footer";
import { TopNav } from "@/components/ui/TopNav";
import { effectiveStatus, findOwnedCapsule } from "@/lib/capsules";
import { userHasGiftAccess } from "@/lib/paywall";
import { r2IsConfigured, signGetUrl, type MediaKind } from "@/lib/r2";

import { CapsuleOverview } from "./CapsuleOverview";

export const metadata = {
  title: "Gift Capsule — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function CapsulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const owned = await findOwnedCapsule(userId, id);
  if (!owned.ok) redirect("/dashboard");

  // Resolve paywall state once here + thread to the client. The
  // activation modal uses this to decide whether to show the
  // card-entry step or let the organiser skip straight through.
  const giftAccessFree = await userHasGiftAccess(owned.user.id);
  const requiresPayment = !giftAccessFree;

  const { prisma } = await import("@/lib/prisma");
  const capsule = await prisma.memoryCapsule.findUnique({
    where: { id },
    include: {
      contributions: {
        // Hide both SCANNING (async scan in flight) and FLAGGED
        // (held for admin review) from the organiser's capsule
        // detail page. Items reappear once Hive resolves to
        // PASS / FAILED_OPEN or an admin clears a flag.
        where: { moderationState: { notIn: ["FLAGGED", "SCANNING"] } },
        orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      },
      invites: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!capsule) redirect("/dashboard");

  const status = effectiveStatus(capsule);

  // Hydrate the organiser's own contribution attachments with
  // signed GET urls so MediaAttachments can render thumbnails
  // for what's already saved.
  const ownContribution = capsule.contributions.find(
    (c) => c.clerkUserId === userId,
  );
  let ownAttachments: Attachment[] = [];
  if (ownContribution && r2IsConfigured() && ownContribution.mediaUrls.length) {
    ownAttachments = await Promise.all(
      ownContribution.mediaUrls.map(async (key, i): Promise<Attachment> => {
        const kind = (ownContribution.mediaTypes[i] ?? "photo") as MediaKind;
        const viewUrl = await signGetUrl(key);
        const name = key.split("/").pop() ?? "attachment";
        return { key, kind, viewUrl, name };
      }),
    );
  }

  // Batch-resolve avatar keys for every contribution author who's a
  // signed-in user, then sign GET URLs in parallel. Anonymous /
  // photo-less authors fall back to amber initials in the UI.
  const contributorClerkIds = Array.from(
    new Set(
      capsule.contributions
        .map((c) => c.clerkUserId)
        .filter((v): v is string => !!v),
    ),
  );
  const avatarUrlByClerkId = new Map<string, string>();
  if (contributorClerkIds.length > 0 && r2IsConfigured()) {
    const authors = await prisma.user.findMany({
      where: { clerkId: { in: contributorClerkIds } },
      select: { clerkId: true, avatarUrl: true },
    });
    await Promise.all(
      authors
        .filter((a) => a.avatarUrl)
        .map(async (a) => {
          try {
            const url = await signGetUrl(a.avatarUrl!);
            avatarUrlByClerkId.set(a.clerkId, url);
          } catch {
            /* skip — initials fallback */
          }
        }),
    );
  }

  return (
    <>
      <TopNav />
      <CapsuleOverview
        capsule={{
        id: capsule.id,
        title: capsule.title,
        recipientName: capsule.recipientName,
        recipientPronoun: capsule.recipientPronoun,
        recipientEmail: capsule.recipientEmail,
        recipientPhone: capsule.recipientPhone,
        occasionType: capsule.occasionType,
        tone: capsule.tone,
        revealDate: capsule.revealDate.toISOString(),
        contributorDeadline:
          capsule.contributorDeadline?.toISOString() ?? null,
        status,
        rawStatus: capsule.status,
        isPaid: capsule.isPaid,
        requiresApproval: capsule.requiresApproval,
        contributionsClosed: capsule.contributionsClosed,
        accessToken: capsule.accessToken,
      }}
      currentUserClerkId={userId}
      requiresPayment={requiresPayment}
      contributions={capsule.contributions.map((c) => ({
        id: c.id,
        authorName: c.authorName,
        authorAvatarUrl: c.clerkUserId
          ? avatarUrlByClerkId.get(c.clerkUserId) ?? null
          : null,
        clerkUserId: c.clerkUserId,
        type: c.type,
        title: c.title,
        body: c.body,
        attachmentCount: c.mediaUrls.length,
        approvalStatus: c.approvalStatus,
        createdAt: c.createdAt.toISOString(),
      }))}
      ownAttachments={ownAttachments}
      invites={capsule.invites.map((i) => ({
        id: i.id,
        email: i.email,
        name: i.name,
        status: i.status,
        requiresApproval: i.requiresApproval,
        inviteToken: i.inviteToken,
      }))}
    />
      <Footer />
    </>
  );
}
