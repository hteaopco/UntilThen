import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { effectiveStatus, findOwnedCapsule } from "@/lib/capsules";

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

  return (
    <CapsuleOverview
      capsule={{
        id: capsule.id,
        title: capsule.title,
        recipientName: capsule.recipientName,
        recipientEmail: capsule.recipientEmail,
        occasionType: capsule.occasionType,
        revealDate: capsule.revealDate.toISOString(),
        contributorDeadline:
          capsule.contributorDeadline?.toISOString() ?? null,
        status,
        isPaid: capsule.isPaid,
        requiresApproval: capsule.requiresApproval,
        accessToken: capsule.accessToken,
      }}
      contributions={capsule.contributions.map((c) => ({
        id: c.id,
        authorName: c.authorName,
        type: c.type,
        body: c.body,
        approvalStatus: c.approvalStatus,
        createdAt: c.createdAt.toISOString(),
      }))}
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
