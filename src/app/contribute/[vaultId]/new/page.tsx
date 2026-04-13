import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { ContributorEntryForm } from "./ContributorEntryForm";

export const metadata = {
  title: "Write a memory — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewContributorEntryPage({
  params,
}: {
  params: Promise<{ vaultId: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/");

  const { vaultId } = await params;

  const { prisma } = await import("@/lib/prisma");
  const contributor = await prisma.contributor.findFirst({
    where: { vaultId, clerkUserId: userId, status: "ACTIVE" },
    include: { vault: { include: { child: true } } },
  });
  if (!contributor) redirect("/");

  return (
    <ContributorEntryForm
      vaultId={vaultId}
      childFirstName={contributor.vault.child.firstName}
      requiresApproval={contributor.requiresApproval}
    />
  );
}
