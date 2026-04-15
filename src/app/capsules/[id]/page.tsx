import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import type { Attachment } from "@/components/editor/MediaAttachments";
import { effectiveStatus, findOwnedCapsule } from "@/lib/capsules";
import { r2IsConfigured, signGetUrl, type MediaKind } from "@/lib/r2";

import { CapsuleOverview } from "./CapsuleOverview";

export const metadata = {
  title: "Memory Capsule — untilThen",
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

  const { prisma } = await import("@/lib/prisma");
  const capsule = await prisma.memoryCapsule.findUnique({
    where: { id },
    include: {
      contributions: {
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

  return (
    <CapsuleOverview
      capsule={{
        id: capsule.id,
        title: capsule.title,
        recipientName: capsule.recipientName,
        recipientEmail: capsule.recipientEmail,
        recipientPhone: capsule.recipientPhone,
        occasionType: capsule.occasionType,
        revealDate: capsule.revealDate.toISOString(),
        contributorDeadline:
          capsule.contributorDeadline?.toISOString() ?? null,
        status,
        rawStatus: capsule.status,
        isPaid: capsule.isPaid,
        requiresApproval: capsule.requiresApproval,
        accessToken: capsule.accessToken,
      }}
      currentUserClerkId={userId}
      contributions={capsule.contributions.map((c) => ({
        id: c.id,
        authorName: c.authorName,
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
        inviteToken: i.inviteToken,
      }))}
    />
  );
}
