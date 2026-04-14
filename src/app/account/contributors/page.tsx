import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import {
  ContributorsManager,
  type ManagerContributor,
  type ManagerVaultOption,
} from "@/components/account/ContributorsManager";

export const metadata = {
  title: "Contributors — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AccountContributorsPage({
  searchParams,
}: {
  searchParams: Promise<{ vault?: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/dashboard");

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      children: {
        include: { vault: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!user) redirect("/onboarding");

  const vaults: ManagerVaultOption[] = user.children
    .filter((c) => c.vault)
    .map((c) => ({
      vaultId: c.vault!.id,
      childFirstName: c.firstName,
    }));

  const sp = await searchParams;
  const activeVaultId =
    vaults.find((v) => v.vaultId === sp.vault)?.vaultId ??
    vaults[0]?.vaultId ??
    null;

  const contributors: ManagerContributor[] = activeVaultId
    ? (
        await prisma.contributor.findMany({
          where: { vaultId: activeVaultId },
          include: {
            _count: {
              select: {
                entries: {
                  where: {
                    isSealed: true,
                    approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      ).map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        role: c.role,
        status: c.status,
        requiresApproval: c.requiresApproval,
        createdAt: c.createdAt.toISOString(),
        acceptedAt: c.acceptedAt?.toISOString() ?? null,
        entryCount: c._count.entries,
        inviteToken: c.inviteToken,
      }))
    : [];

  return (
    <ContributorsManager
      vaults={vaults}
      activeVaultId={activeVaultId}
      contributors={contributors}
    />
  );
}
