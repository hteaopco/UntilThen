import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar } from "@/components/ui/Avatar";
import {
  ApprovalQueue,
  type PendingEntry,
} from "@/components/dashboard/ApprovalQueue";
import {
  CollectionsSection,
  type CollectionRow,
} from "@/components/dashboard/CollectionsSection";
import {
  ContributorsSection,
  type ContributorRow,
} from "@/components/dashboard/ContributorsSection";
import { EntryList, type EntryRow } from "@/components/dashboard/EntryList";
import { NewButton } from "@/components/dashboard/NewButton";
import { VaultHero } from "@/components/dashboard/VaultHero";
import {
  VaultSwitcher,
  type VaultOption,
} from "@/components/dashboard/VaultSwitcher";
import { LogoSvg } from "@/components/ui/LogoSvg";

export const metadata = {
  title: "Your vault — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ vault?: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  if (!process.env.DATABASE_URL) {
    return <DbMissing />;
  }

  const { vault: vaultParam } = await searchParams;

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

  // Only children who have a vault are switchable. If the user has
  // no child at all, they still need to complete onboarding.
  const childrenWithVaults = user.children.filter((c) => c.vault !== null);
  if (childrenWithVaults.length === 0) redirect("/onboarding");

  // Pick the active child: URL param if it matches an owned child,
  // otherwise the first one.
  const selectedChild =
    childrenWithVaults.find((c) => c.id === vaultParam) ??
    childrenWithVaults[0];
  // Narrowed by the filter above.
  const vault = selectedChild.vault!;
  const vaultRevealDate = vault.revealDate?.toISOString() ?? null;

  const [
    vaultEntries,
    vaultCollections,
    contributorRecords,
    pendingEntries,
  ] = await Promise.all([
    prisma.entry.findMany({
      where: {
        vaultId: vault.id,
        collectionId: null,
        isSealed: true,
        approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.collection.findMany({
      where: { vaultId: vault.id },
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
    }),
    prisma.contributor.findMany({
      where: { vaultId: vault.id, status: { not: "REVOKED" } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.entry.findMany({
      where: {
        vaultId: vault.id,
        isSealed: true,
        approvalStatus: "PENDING_REVIEW",
      },
      include: { contributor: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const contributors: ContributorRow[] = contributorRecords.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    role: c.role,
    status: c.status,
    requiresApproval: c.requiresApproval,
  }));

  const pending: PendingEntry[] = pendingEntries.map((e) => ({
    id: e.id,
    title: e.title,
    type: e.type,
    createdAt: e.createdAt.toISOString(),
    contributorName:
      e.contributor?.name ?? e.contributor?.email ?? "A contributor",
  }));

  const entries: EntryRow[] = vaultEntries.map((e) => ({
    id: e.id,
    type: e.type,
    title: e.title,
    body: e.body,
    createdAt: e.createdAt.toISOString(),
    revealDate: e.revealDate?.toISOString() ?? null,
  }));

  const collections: CollectionRow[] = vaultCollections.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    coverEmoji: c.coverEmoji,
    revealDate: c.revealDate?.toISOString() ?? null,
    isSealed: c.isSealed,
    entryCount: c._count.entries,
  }));

  const totalSealed =
    entries.length +
    collections.reduce((acc, c) => acc + c.entryCount, 0);

  const switcherOptions: VaultOption[] = childrenWithVaults.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    vaultId: c.vault!.id,
  }));

  return (
    <main className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-navy/[0.06]">
        <div className="mx-auto max-w-[980px] px-6 lg:px-10 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center" aria-label="Your vault">
            <LogoSvg variant="dark" width={130} height={26} />
          </Link>
          <Avatar />
        </div>
      </header>

      <section className="mx-auto max-w-[980px] px-6 lg:px-10 pt-8 lg:pt-10">
        <VaultSwitcher
          options={switcherOptions}
          selectedChildId={selectedChild.id}
        />
        <VaultHero
          childId={selectedChild.id}
          childFirstName={selectedChild.firstName}
          vaultId={vault.id}
          revealDate={vaultRevealDate}
          entryCount={totalSealed}
        />
      </section>

      <section className="mx-auto max-w-[980px] px-6 lg:px-10 pt-10 lg:pt-14 pb-24">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-navy tracking-[-0.3px]">
              Sealed entries
            </h2>
            <p className="text-sm text-ink-mid mt-1">
              Your child will open these on reveal day.
            </p>
          </div>
          <NewButton
            vaultId={vault.id}
            vaultRevealDate={vaultRevealDate}
          />
        </div>

        <ApprovalQueue entries={pending} />

        <ContributorsSection
          contributors={contributors}
          vaultId={vault.id}
        />

        <CollectionsSection
          collections={collections}
          vaultRevealDate={vaultRevealDate}
          vaultId={vault.id}
        />

        {collections.length > 0 && (
          <div className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink-mid mb-4">
            Entries · {entries.length}
          </div>
        )}
        <EntryList
          entries={entries}
          childFirstName={selectedChild.firstName}
          revealDate={vaultRevealDate}
        />
      </section>
    </main>
  );
}

function DbMissing() {
  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-extrabold text-navy mb-2 tracking-[-0.5px]">
          Database not reachable
        </h1>
        <p className="text-ink-mid">
          DATABASE_URL isn&rsquo;t set. Once Postgres is wired up on Railway,
          your vault will appear here.
        </p>
      </div>
    </main>
  );
}
