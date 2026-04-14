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
import { MemoryStarter } from "@/components/dashboard/MemoryStarter";
import { StartCollectionLink } from "@/components/dashboard/StartCollectionLink";
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
    latestDraft,
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
    // Most recent in-progress draft — only the parent's own
    // drafts show up as "continue writing" (contributors go
    // through a separate flow).
    prisma.entry.findFirst({
      where: {
        vaultId: vault.id,
        authorId: user.id,
        isDraft: true,
        isSealed: false,
      },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, updatedAt: true },
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

        {/* Primary: creation spark right at the top of the page.
            If a draft exists, it offers to resume that instead of
            starting over. */}
        <MemoryStarter
          childFirstName={selectedChild.firstName}
          vaultId={vault.id}
          draft={
            latestDraft
              ? {
                  id: latestDraft.id,
                  title: latestDraft.title,
                  updatedAt: latestDraft.updatedAt.toISOString(),
                }
              : null
          }
        />

        {/* Anything that needs the parent's attention jumps in here
            — pending approvals only surface when contributors have
            submitted entries that require review. */}
        {pending.length > 0 && (
          <div className="mt-8">
            <ApprovalQueue entries={pending} />
          </div>
        )}

        {/* Vault — secondary context now. Countdown + emotional
            framing, with the action links demoted to text.
            Tight mt-5/mt-6 keeps the editor and vault reading as
            one connected block. */}
        <div className="mt-5 lg:mt-6">
          <VaultHero
            childId={selectedChild.id}
            childFirstName={selectedChild.firstName}
            childDateOfBirth={
              selectedChild.dateOfBirth?.toISOString() ?? null
            }
            vaultId={vault.id}
            revealDate={vaultRevealDate}
            entryCount={totalSealed}
          />
        </div>
      </section>

      <section className="mx-auto max-w-[980px] px-6 lg:px-10 pt-10 lg:pt-14 pb-24">
        <div className="flex items-end justify-between gap-4 flex-wrap mb-6">
          <div className="text-center lg:text-left">
            <h2 className="text-xl lg:text-2xl font-bold text-navy tracking-[-0.3px]">
              Moments you&rsquo;ve sealed
            </h2>
            <p className="text-sm text-ink-mid mt-1">
              A timeline of moments sealed for {selectedChild.firstName}.
            </p>
          </div>
          {/* Collection-starter is a quiet secondary action now —
              "New entry" was redundant with the editor spark at the
              top of the page. */}
          <StartCollectionLink
            vaultId={vault.id}
            vaultRevealDate={vaultRevealDate}
            childFirstName={selectedChild.firstName}
            childDateOfBirth={
              selectedChild.dateOfBirth?.toISOString() ?? null
            }
          />
        </div>

        <CollectionsSection
          collections={collections}
          vaultRevealDate={vaultRevealDate}
          vaultId={vault.id}
        />

        <EntryList
          entries={entries}
          childFirstName={selectedChild.firstName}
          revealDate={vaultRevealDate}
        />

        <ContributorsSection
          contributors={contributors}
          vaultId={vault.id}
          childFirstName={selectedChild.firstName}
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
