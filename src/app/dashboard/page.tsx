import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Lock, PlusCircle, Sparkles, Gift, Inbox } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Footer } from "@/components/landing/Footer";
import { NewVaultButton } from "@/components/dashboard/NewVaultButton";
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
import { VaultHero } from "@/components/dashboard/VaultHero";
import { LogoSvg } from "@/components/ui/LogoSvg";
import { effectiveStatus } from "@/lib/capsules";
import { formatLong } from "@/lib/dateFormatters";

export const metadata = {
  title: "Your Vault — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ── Occasion emoji lookup (shared with DashboardGrid) ─────────

const OCCASION_EMOJI: Record<string, string> = {
  BIRTHDAY: "🎂",
  ANNIVERSARY: "💍",
  RETIREMENT: "🎉",
  GRADUATION: "🎓",
  WEDDING: "💐",
  OTHER: "✨",
};

function capsuleStatusLabel(s: string): string {
  switch (s) {
    case "DRAFT": return "Draft";
    case "ACTIVE": return "Collecting";
    case "SEALED": return "Sealed";
    case "REVEALED": return "Revealed";
    default: return s;
  }
}

function capsuleStatusClass(s: string): string {
  switch (s) {
    case "DRAFT": return "text-ink-light bg-[#f1f5f9]";
    case "ACTIVE": return "text-amber bg-amber-tint";
    case "SEALED": return "text-gold bg-gold-tint";
    case "REVEALED": return "text-green-700 bg-green-50";
    default: return "text-ink-light bg-[#f1f5f9]";
  }
}

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

  const selectedChild =
    (vaultParam
      ? childrenWithVaults.find((c) => c.id === vaultParam)
      : undefined) ?? childrenWithVaults[0] ?? null;

  const vault = selectedChild?.vault ?? null;
  const vaultRevealDate = vault?.revealDate?.toISOString() ?? null;

  // ── All queries in parallel ─────────────────────────────────
  const [
    capsuleRecords,
    contributingToRecords,
    receivedRecords,
    vaultEntries,
    vaultCollections,
    contributorRecords,
    pendingEntries,
    latestDraft,
  ] = await Promise.all([
    // My Gift Capsules (organised by me)
    prisma.memoryCapsule.findMany({
      where: { organiserId: user.id },
      include: { _count: { select: { invites: true, contributions: true } } },
      orderBy: { createdAt: "desc" },
    }),
    // Capsules I'm contributing to (not my own)
    prisma.memoryCapsule.findMany({
      where: {
        contributions: { some: { clerkUserId: userId } },
        organiserId: { not: user.id },
      },
      include: {
        organiser: { select: { firstName: true } },
        _count: { select: { contributions: true } },
      },
      orderBy: { revealDate: "asc" },
    }),
    // Received — capsules addressed to me
    prisma.memoryCapsule.findMany({
      where: { recipientClerkId: userId },
      include: {
        _count: { select: { contributions: true } },
      },
      orderBy: { revealDate: "asc" },
    }),
    // Vault-scoped data (only when a time capsule is selected)
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
                    approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] },
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

  // ── Transform query results ─────────────────────────────────

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

  return (
    <main className="min-h-screen bg-cream flex flex-col">
      {/* ── Header ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-navy/[0.06]">
        <div className="mx-auto max-w-[980px] px-6 lg:px-10 py-4 flex items-center justify-between gap-6">
          <Link href="/dashboard" className="flex items-center shrink-0" aria-label="Your Vault">
            <LogoSvg variant="dark" width={130} height={26} />
          </Link>
          <ul className="hidden lg:flex items-center gap-7 text-sm text-ink-mid">
            <li><Link href="/#how" className="hover:text-navy transition-colors font-medium">How it works</Link></li>
            <li><Link href="/#pricing" className="hover:text-navy transition-colors font-medium">Pricing</Link></li>
            <li><Link href="/blog" className="hover:text-navy transition-colors font-medium">Blog</Link></li>
            <li><Link href="/faq" className="hover:text-navy transition-colors font-medium">FAQ</Link></li>
          </ul>
          <Avatar />
        </div>
      </header>

      <div className="mx-auto max-w-[980px] w-full px-6 lg:px-10 pt-8 lg:pt-10 pb-8 flex-1">

        {/* ═══════════════════════════════════════════════════════
            SECTION 1 — My Time Capsules
            ═══════════════════════════════════════════════════════ */}
        <section className="mb-10">
          <h2 className="text-[11px] uppercase tracking-[0.14em] font-bold text-navy mb-4">
            My Time Capsules · {childrenWithVaults.length}
          </h2>

          {childrenWithVaults.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-navy/10 bg-warm-surface/60 px-5 py-8 text-center">
              <p className="text-sm text-ink-mid leading-[1.5]">
                Start writing to someone you love.
              </p>
              <NewVaultButton variant="primary" label="Start a Time Capsule →" />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {childrenWithVaults.map((c) => (
                <Link
                  key={c.id}
                  href={`/dashboard?vault=${c.id}`}
                  className={`rounded-2xl border bg-white px-5 py-4 block transition-all ${
                    selectedChild?.id === c.id
                      ? "border-amber/40 shadow-[0_8px_24px_rgba(196,122,58,0.12)]"
                      : "border-navy/[0.07] hover:border-amber/30 hover:shadow-[0_6px_18px_rgba(15,31,61,0.05)]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl bg-amber-tint text-amber flex items-center justify-center">
                      <Lock size={18} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[15px] font-bold text-navy tracking-[-0.2px] truncate">
                        {c.firstName}&rsquo;s Capsule
                      </div>
                      {c.vault?.revealDate && (
                        <div className="text-xs text-ink-mid mt-0.5">
                          Opens {formatLong(c.vault.revealDate.toISOString())}
                        </div>
                      )}
                      <div className="text-[11px] text-ink-light mt-0.5">
                        {(c.vault?._count.entries ?? 0).toLocaleString()}{" "}
                        {(c.vault?._count.entries ?? 0) === 1 ? "moment sealed" : "moments sealed"}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {childrenWithVaults.length > 0 && (
            <div className="mt-3">
              <NewVaultButton />
            </div>
          )}
        </section>

        {/* ── Selected Time Capsule detail ──────────────────── */}
        {selectedChild && vault && (
          <>
            <section className="mb-8">
              <MemoryStarter
                childFirstName={selectedChild.firstName}
                vaultId={vault.id}
                vaultRevealDate={vaultRevealDate}
                childDateOfBirth={selectedChild.dateOfBirth?.toISOString() ?? null}
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
                  childDateOfBirth={selectedChild.dateOfBirth?.toISOString() ?? null}
                  vaultId={vault.id}
                  revealDate={vaultRevealDate}
                />
              </div>
            </section>

            <section className="mb-10">
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

        {/* ═══════════════════════════════════════════════════════
            SECTION 2 — My Gift Capsules
            ═══════════════════════════════════════════════════════ */}
        <section className="mb-10 pt-6 border-t border-navy/[0.06]">
          <h2 className="text-[11px] uppercase tracking-[0.14em] font-bold text-navy mb-4">
            My Gift Capsules · {capsuleRecords.length}
          </h2>

          {capsuleRecords.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-navy/10 bg-warm-surface/60 px-5 py-8 text-center">
              <p className="text-sm text-ink-mid leading-[1.5]">
                Create a moment someone will never forget.
              </p>
              <Link
                href="/capsules/new"
                className="mt-4 inline-flex items-center gap-2 bg-amber text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
              >
                <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
                New Gift Capsule
              </Link>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {capsuleRecords.map((c) => {
                const status = effectiveStatus(c);
                const contribCount = c._count.contributions || c._count.invites;
                return (
                  <Link
                    key={c.id}
                    href={`/capsules/${c.id}`}
                    className="rounded-2xl border border-navy/[0.07] bg-white px-5 py-4 block hover:border-amber/30 hover:shadow-[0_6px_18px_rgba(15,31,61,0.05)] transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl bg-amber-tint flex items-center justify-center text-xl">
                        {OCCASION_EMOJI[c.occasionType] ?? "✨"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="text-[15px] font-bold text-navy tracking-[-0.2px] truncate flex-1 min-w-0">
                            {c.title}
                          </div>
                          <span className={`text-[10px] uppercase tracking-[0.12em] font-bold px-2 py-0.5 rounded ${capsuleStatusClass(status)}`}>
                            {capsuleStatusLabel(status)}
                          </span>
                        </div>
                        <div className="text-xs text-ink-mid mt-0.5">
                          Opens {formatLong(c.revealDate.toISOString())}
                        </div>
                        <div className="text-[11px] text-ink-light mt-0.5">
                          {contribCount.toLocaleString()} {contribCount === 1 ? "contributor" : "contributors"}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {capsuleRecords.length > 0 && (
            <div className="mt-3">
              <Link
                href="/capsules/new"
                className="inline-flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg border border-amber/40 text-amber text-sm font-bold hover:bg-amber-tint transition-colors"
              >
                <PlusCircle size={14} strokeWidth={1.75} aria-hidden="true" />
                New Gift Capsule
              </Link>
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════
            SECTION 3 — Capsules I'm Contributing To
            ═══════════════════════════════════════════════════════ */}
        <section className="mb-10 pt-6 border-t border-navy/[0.06]">
          <h2 className="text-[11px] uppercase tracking-[0.14em] font-bold text-navy mb-4">
            Contributing To · {contributingToRecords.length}
          </h2>

          {contributingToRecords.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-navy/10 bg-warm-surface/60 px-5 py-6 text-center">
              <p className="text-sm text-ink-mid leading-[1.5]">
                You haven&rsquo;t been invited to contribute yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {contributingToRecords.map((c) => {
                const status = effectiveStatus(c);
                return (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-navy/[0.07] bg-white px-5 py-4"
                  >
                    <div className="flex items-start gap-3">
                      <div aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl bg-amber-tint flex items-center justify-center text-xl">
                        <Gift size={18} strokeWidth={1.5} className="text-amber" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-bold text-navy tracking-[-0.2px] truncate">
                          {c.title}
                        </div>
                        <div className="text-xs text-ink-mid mt-0.5">
                          Organised by {c.organiser.firstName}
                        </div>
                        <div className="text-xs text-ink-mid mt-0.5">
                          Opens {formatLong(c.revealDate.toISOString())}
                        </div>
                        <span className={`inline-block mt-1.5 text-[10px] uppercase tracking-[0.12em] font-bold px-2 py-0.5 rounded ${capsuleStatusClass(status)}`}>
                          {capsuleStatusLabel(status)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ═══════════════════════════════════════════════════════
            SECTION 4 — Received
            ═══════════════════════════════════════════════════════ */}
        <section className="mb-10 pt-6 border-t border-navy/[0.06]">
          <h2 className="text-[11px] uppercase tracking-[0.14em] font-bold text-navy mb-4">
            Received · {receivedRecords.length}
          </h2>

          {receivedRecords.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-navy/10 bg-warm-surface/60 px-5 py-6 text-center">
              <p className="text-sm text-ink-mid leading-[1.5] italic">
                Someone&rsquo;s writing to you. You just don&rsquo;t know it yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {receivedRecords.map((c) => {
                const opened = Boolean(c.firstOpenedAt);
                return (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-navy/[0.07] bg-white/80 px-5 py-4"
                  >
                    <div className="flex items-start gap-3">
                      <div aria-hidden="true" className="shrink-0 w-10 h-10 rounded-xl bg-gold-tint flex items-center justify-center text-xl">
                        <Inbox size={18} strokeWidth={1.5} className="text-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-bold text-navy tracking-[-0.2px] truncate">
                          {c.title}
                        </div>
                        <div className="text-xs text-ink-mid mt-0.5">
                          {opened ? "Opened" : `Opens ${formatLong(c.revealDate.toISOString())}`}
                        </div>
                        <div className="text-[11px] text-ink-light mt-0.5">
                          {c._count.contributions.toLocaleString()} {c._count.contributions === 1 ? "memory" : "memories"}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>

      <div className="mt-auto">
        <Footer />
      </div>
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
