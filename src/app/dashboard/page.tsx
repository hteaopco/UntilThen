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
import {
  DashboardGrid,
  type DashboardCapsule,
  type DashboardVault,
} from "@/components/dashboard/DashboardGrid";
import { EntryList, type EntryRow } from "@/components/dashboard/EntryList";
import { MemoryStarter } from "@/components/dashboard/MemoryStarter";
import { VaultHero } from "@/components/dashboard/VaultHero";
import {
  VaultSwitcher,
  type VaultOption,
} from "@/components/dashboard/VaultSwitcher";
import { LogoSvg } from "@/components/ui/LogoSvg";
import { effectiveStatus } from "@/lib/capsules";

export const metadata = {
  title: "Your dashboard — untilThen",
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
        include: {
          vault: {
            include: {
              _count: {
                select: {
                  entries: {
                    where: {
                      isSealed: true,
                      approvalStatus: {
                        in: ["AUTO_APPROVED", "APPROVED"],
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!user) redirect("/onboarding");

  const childrenWithVaults = user.children.filter((c) => c.vault !== null);
  const hasAnyVault = childrenWithVaults.length > 0;

  // Resolve the active vault if there is one. Memory Capsule-only
  // users see an empty vault column; everything below the grid
  // gates on `selectedChild` so those sections stay hidden.
  const selectedChild =
    (vaultParam
      ? childrenWithVaults.find((c) => c.id === vaultParam)
      : undefined) ?? childrenWithVaults[0] ?? null;

  const vault = selectedChild?.vault ?? null;
  const vaultRevealDate = vault?.revealDate?.toISOString() ?? null;

  // Fetch the capsules the user is organising, plus — when a
  // vault is selected — the vault-scoped data for the lower
  // half of the dashboard.
  const [capsuleRecords, vaultEntries, vaultCollections, contributorRecords, pendingEntries, latestDraft] =
    await Promise.all([
      prisma.memoryCapsule.findMany({
        where: { organiserId: user.id },
        include: { _count: { select: { invites: true, contributions: true } } },
        orderBy: { createdAt: "desc" },
      }),
      vault
        ? prisma.entry.findMany({
            where: {
              vaultId: vault.id,
              collectionId: null,
              isSealed: true,
              approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] },
            },
            orderBy: { createdAt: "desc" },
            take: 50,
          })
        : Promise.resolve([]),
      vault
        ? prisma.collection.findMany({
            where: { vaultId: vault.id },
            include: {
              _count: {
                select: {
                  entries: {
                    where: {
                      isSealed: true,
                      approvalStatus: {
                        in: ["AUTO_APPROVED", "APPROVED"],
                      },
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
      vault
        ? prisma.contributor.findMany({
            where: { vaultId: vault.id, status: { not: "REVOKED" } },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
      vault
        ? prisma.entry.findMany({
            where: {
              vaultId: vault.id,
              isSealed: true,
              approvalStatus: "PENDING_REVIEW",
            },
            include: { contributor: true },
            orderBy: { createdAt: "desc" },
          })
        : Promise.resolve([]),
      vault
        ? prisma.entry.findFirst({
            where: {
              vaultId: vault.id,
              authorId: user.id,
              isDraft: true,
              isSealed: false,
            },
            orderBy: { updatedAt: "desc" },
            select: { id: true, title: true, updatedAt: true },
          })
        : Promise.resolve(null),
    ]);

  const dashboardVaults: DashboardVault[] = childrenWithVaults.map((c) => ({
    childId: c.id,
    firstName: c.firstName,
    revealDate: c.vault!.revealDate?.toISOString() ?? null,
    momentsSealed: c.vault!._count.entries,
  }));

  const dashboardCapsules: DashboardCapsule[] = capsuleRecords.map((c) => ({
    id: c.id,
    title: c.title,
    occasionType: c.occasionType,
    revealDate: c.revealDate.toISOString(),
    status: effectiveStatus(c),
    contributorCount: c._count.contributions || c._count.invites,
  }));

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

  const switcherOptions: VaultOption[] = childrenWithVaults.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    vaultId: c.vault!.id,
  }));

  return (
    <main className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-navy/[0.06]">
        <div className="mx-auto max-w-[980px] px-6 lg:px-10 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center" aria-label="Dashboard">
            <LogoSvg variant="dark" width={130} height={26} />
          </Link>
          <Avatar />
        </div>
      </header>

      <section className="mx-auto max-w-[980px] px-6 lg:px-10 pt-8 lg:pt-10 pb-6">
        {selectedChild && (
          <VaultSwitcher
            options={switcherOptions}
            selectedChildId={selectedChild.id}
            flush
          />
        )}

        <div className={selectedChild ? "mt-4" : ""}>
          <DashboardGrid
            vaults={dashboardVaults}
            capsules={dashboardCapsules}
            activeVaultChildId={selectedChild?.id ?? null}
          />
        </div>

        {!hasAnyVault && (
          <div className="mt-8 rounded-2xl border border-amber/20 bg-amber-tint/40 px-5 py-5 text-center">
            <h2 className="text-lg font-extrabold text-navy tracking-[-0.3px]">
              Your dashboard is ready.
            </h2>
            <p className="mt-1.5 text-sm text-ink-mid leading-[1.5]">
              Create a capsule to collect memories for an occasion, or add a
              child vault for long-form letters across years.
            </p>
          </div>
        )}
      </section>

      {selectedChild && vault && (
        <>
          <section className="mx-auto max-w-[980px] px-6 lg:px-10 pt-4 lg:pt-6">
            {/* Primary: creation spark. If a draft exists, it offers
                to resume that instead of starting over. */}
            <MemoryStarter
              childFirstName={selectedChild.firstName}
              vaultId={vault.id}
              vaultRevealDate={vaultRevealDate}
              childDateOfBirth={
                selectedChild.dateOfBirth?.toISOString() ?? null
              }
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

            {pending.length > 0 && (
              <div className="mt-8">
                <ApprovalQueue entries={pending} />
              </div>
            )}

            <div className="mt-5 lg:mt-6">
              <VaultHero
                childId={selectedChild.id}
                childFirstName={selectedChild.firstName}
                childDateOfBirth={
                  selectedChild.dateOfBirth?.toISOString() ?? null
                }
                vaultId={vault.id}
                revealDate={vaultRevealDate}
              />
            </div>
          </section>

          <section className="mx-auto max-w-[980px] px-6 lg:px-10 pt-6 lg:pt-8 pb-24">
            <div className="text-center lg:text-left mb-6">
              <h2 className="text-xl lg:text-2xl font-bold text-navy tracking-[-0.3px]">
                Moments you&rsquo;ve sealed for {selectedChild.firstName}
              </h2>
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
              vaultId={vault.id}
            />

            <ContributorsSection
              contributors={contributors}
              vaultId={vault.id}
              childFirstName={selectedChild.firstName}
            />
          </section>
        </>
      )}
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
          your dashboard will appear here.
        </p>
      </div>
    </main>
  );
}
