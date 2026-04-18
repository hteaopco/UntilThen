import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ArrowLeft, Cake, Flower2, Gift, GraduationCap, Heart, Inbox, Lock, PartyPopper, PlusCircle, Sparkles } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Footer } from "@/components/landing/Footer";
import { NewVaultButton } from "@/components/dashboard/NewVaultButton";
import {
  CapsuleListCollapsible,
  GiftCapsulePricingCard,
} from "@/components/dashboard/GiftCapsuleSection";
import {
  TimeCapsuleCarousel,
  type TimeCapsuleItem,
} from "@/components/dashboard/TimeCapsuleCarousel";
import {
  ApprovalQueue,
  type PendingEntry,
} from "@/components/dashboard/ApprovalQueue";
import {
  CollectionsSection,
  type CollectionRow,
} from "@/components/dashboard/CollectionsSection";
import { EntryList, type EntryRow } from "@/components/dashboard/EntryList";
import { MemoryStarter } from "@/components/dashboard/MemoryStarter";
import { VaultHero } from "@/components/dashboard/VaultHero";
import { LogoSvg } from "@/components/ui/LogoSvg";
import { effectiveStatus } from "@/lib/capsules";
import { formatLong } from "@/lib/dateFormatters";

export const metadata = {
  title: "Your Vault — untilThen",
};

export const revalidate = 30;
export const runtime = "nodejs";

// ── Helpers ───────────────────────────────────────────────────

const OCCASION_ICON: Record<string, React.ReactNode> = {
  BIRTHDAY: <Cake size={20} strokeWidth={1.5} />,
  ANNIVERSARY: <Heart size={20} strokeWidth={1.5} />,
  RETIREMENT: <PartyPopper size={20} strokeWidth={1.5} />,
  GRADUATION: <GraduationCap size={20} strokeWidth={1.5} />,
  WEDDING: <Flower2 size={20} strokeWidth={1.5} />,
  OTHER: <Sparkles size={20} strokeWidth={1.5} />,
};

function statusLabel(s: string): string {
  switch (s) {
    case "DRAFT": return "Draft";
    case "ACTIVE": return "Collecting";
    case "SEALED": return "Sealed";
    case "REVEALED": return "Revealed";
    default: return s;
  }
}

function statusClass(s: string): string {
  switch (s) {
    case "DRAFT": return "text-ink-light bg-[#f1f5f9]";
    case "ACTIVE": return "text-amber bg-amber-tint";
    case "SEALED": return "text-gold bg-gold-tint";
    case "REVEALED": return "text-green-700 bg-green-50";
    default: return "text-ink-light bg-[#f1f5f9]";
  }
}

// ── Page ──────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ vault?: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) return <DbMissing />;

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
                      approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] },
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

  // If a vault param is present render the "inside a capsule"
  // detail view. Otherwise render the carousel dashboard.
  const selectedChild = vaultParam
    ? childrenWithVaults.find((c) => c.id === vaultParam) ?? null
    : null;

  if (selectedChild && selectedChild.vault) {
    return (
      <CapsuleDetailView
        user={user}
        child={selectedChild}
        vault={selectedChild.vault}
        userId={userId}
      />
    );
  }

  // Check if user is a trustee for anyone
  let trusteeFor: { childFirstName: string; parentFirstName: string }[] = [];
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const userEmail =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress;
    if (userEmail) {
      const trusteeChildren = await prisma.child.findMany({
        where: { trusteeEmail: userEmail },
        include: { parent: { select: { firstName: true } } },
      });
      trusteeFor = trusteeChildren.map((c) => ({
        childFirstName: c.firstName,
        parentFirstName: c.parent.firstName,
      }));
    }
  } catch { /* ignore */ }

  // ── Carousel dashboard ────────────────────────────────────
  const [capsuleRecords, contributingToRecords, receivedRecords, pendingContributions] =
    await Promise.all([
      prisma.memoryCapsule.findMany({
        where: { organiserId: user.id },
        include: { _count: { select: { invites: true, contributions: true } } },
        orderBy: { createdAt: "desc" },
      }),
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
      prisma.memoryCapsule.findMany({
        where: { recipientClerkId: userId },
        include: { _count: { select: { contributions: true } } },
        orderBy: { revealDate: "asc" },
      }),
      prisma.capsuleContribution.findMany({
        where: {
          capsule: { organiserId: user.id },
          approvalStatus: "PENDING_REVIEW",
        },
        include: { capsule: { select: { id: true, title: true } } },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const carouselItems: TimeCapsuleItem[] = childrenWithVaults.map((c) => ({
    childId: c.id,
    firstName: c.firstName,
    revealDate: c.vault!.revealDate?.toISOString() ?? null,
    memoriesCount: c.vault!._count.entries,
    vaultId: c.vault!.id,
  }));

  return (
    <main className="min-h-screen bg-cream flex flex-col overflow-x-hidden">
      <DashboardHeader />

      <div className="mx-auto max-w-[980px] w-full px-6 lg:px-10 pt-8 pb-6 flex-1">
        {/* ── Your Vault heading ─────────────────────────── */}
        {/* ── Pending review notifications ───────────────── */}
        {pendingContributions.length > 0 && (
          <div className="mb-6 space-y-2">
            {pendingContributions.map((c) => (
              <Link
                key={c.id}
                href={`/capsules/${c.capsule.id}`}
                className="flex items-start gap-3 rounded-xl border border-amber/25 bg-amber-tint/50 px-4 py-3 hover:bg-amber-tint transition-colors"
              >
                <Sparkles size={16} strokeWidth={1.75} className="text-amber shrink-0 mt-0.5" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy">
                    New submission for &ldquo;{c.capsule.title}&rdquo; by {c.authorName}
                  </p>
                  <p className="text-xs text-ink-mid mt-0.5">Click to review</p>
                </div>
              </Link>
            ))}
          </div>
        )}

        {trusteeFor.length > 0 && (
          <div className="mb-6 space-y-2">
            {trusteeFor.map((t, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-xl border border-sage/25 bg-sage-tint/50 px-4 py-3"
              >
                <Lock size={16} strokeWidth={1.75} className="text-sage shrink-0 mt-0.5" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy">
                    {t.parentFirstName} named you as a trusted person for {t.childFirstName}&rsquo;s capsule.
                  </p>
                  <p className="text-xs text-ink-mid mt-0.5">
                    If they&rsquo;re ever unable to access their account, you may be contacted.
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <h1 className="text-[32px] lg:text-[40px] font-extrabold text-navy tracking-[-1px] text-center mb-8">
          Your Vault
        </h1>

        {/* ── Time Capsule carousel ──────────────────────── */}
        {carouselItems.length > 0 ? (
          <TimeCapsuleCarousel items={carouselItems} />
        ) : (
          <div className="rounded-2xl border border-dashed border-navy/10 bg-warm-surface/60 px-5 py-10 text-center mb-6">
            <p className="text-sm text-ink-mid leading-[1.5]">
              Start writing to someone you love.
            </p>
            <NewVaultButton variant="primary" label="Start a Time Capsule" />
          </div>
        )}


        {/* ── Gift Capsules (secondary) ──────────────────── */}
        <section className="pt-8 border-t border-navy/[0.06] mb-10">
          <h2 className="text-[11px] uppercase tracking-[0.14em] font-bold text-ink-light mb-4">
            Gift Capsules · {capsuleRecords.length}
          </h2>
          {capsuleRecords.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-navy/10 bg-white/60 px-5 py-6 text-center">
              <p className="text-[13px] text-ink-light leading-[1.5]">
                Create a moment someone will never forget.
              </p>
              <Link
                href="/capsules/new"
                className="mt-3 inline-flex items-center gap-2 bg-amber text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
              >
                <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
                New Gift Capsule
              </Link>
            </div>
          ) : (
            <CapsuleListCollapsible total={capsuleRecords.length}>
              {capsuleRecords.map((c) => {
                const s = effectiveStatus(c);
                return (
                  <Link
                    key={c.id}
                    href={`/capsules/${c.id}`}
                    className="flex items-center gap-3 rounded-xl border border-navy/[0.06] bg-white px-4 py-3 hover:border-amber/25 transition-colors"
                  >
                    <span className="text-amber shrink-0" aria-hidden="true">
                      {OCCASION_ICON[c.occasionType] ?? <Sparkles size={20} strokeWidth={1.5} />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-navy truncate">
                        {c.title}
                      </div>
                      <div className="text-[12px] text-ink-light">
                        Opens {formatLong(c.revealDate.toISOString())} · {(c._count.contributions || c._count.invites).toLocaleString()} contributors
                      </div>
                    </div>
                    <span className={`text-[9px] uppercase tracking-[0.12em] font-bold px-2 py-0.5 rounded ${statusClass(s)}`}>
                      {statusLabel(s)}
                    </span>
                  </Link>
                );
              })}
            </CapsuleListCollapsible>
          )}

          <GiftCapsulePricingCard />
        </section>

        {/* ── Contributing To (secondary) ────────────────── */}
        <section className="pt-6 border-t border-navy/[0.06] mb-10">
          <h2 className="text-[11px] uppercase tracking-[0.14em] font-bold text-ink-light mb-4">
            Contributing To · {contributingToRecords.length}
          </h2>
          {contributingToRecords.length === 0 ? (
            <div className="rounded-xl border border-dashed border-navy/8 bg-white/60 px-4 py-5">
              <p className="text-[13px] text-ink-light italic">
                You haven&rsquo;t been invited to contribute yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {contributingToRecords.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border border-navy/[0.06] bg-white px-4 py-3">
                  <Gift size={16} strokeWidth={1.5} className="text-ink-light shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-navy truncate">{c.title}</div>
                    <div className="text-[12px] text-ink-light">
                      By {c.organiser.firstName} · Opens {formatLong(c.revealDate.toISOString())}
                    </div>
                  </div>
                  <span className={`text-[9px] uppercase tracking-[0.12em] font-bold px-2 py-0.5 rounded ${statusClass(effectiveStatus(c))}`}>
                    {statusLabel(effectiveStatus(c))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Received (secondary) ───────────────────────── */}
        <section className="pt-6 border-t border-navy/[0.06] mb-10">
          <h2 className="text-[11px] uppercase tracking-[0.14em] font-bold text-ink-light mb-4">
            Received · {receivedRecords.length}
          </h2>
          {receivedRecords.length === 0 ? (
            <div className="rounded-xl border border-dashed border-navy/8 bg-white/60 px-4 py-5">
              <p className="text-[13px] text-ink-light italic">
                Someone&rsquo;s writing to you. You just don&rsquo;t know it yet.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {receivedRecords.map((c) => (
                <div key={c.id} className="flex items-center gap-3 rounded-xl border border-navy/[0.06] bg-white/80 px-4 py-3">
                  <Inbox size={16} strokeWidth={1.5} className="text-gold shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-navy truncate">{c.title}</div>
                    <div className="text-[12px] text-ink-light">
                      {c.firstOpenedAt ? "Opened" : `Opens ${formatLong(c.revealDate.toISOString())}`} · {c._count.contributions} {c._count.contributions === 1 ? "memory" : "memories"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Footer />
    </main>
  );
}

// ── Capsule detail view (entered a specific Time Capsule) ─────

async function CapsuleDetailView({
  user,
  child,
  vault,
  userId,
}: {
  user: { id: string; firstName: string };
  child: { id: string; firstName: string; dateOfBirth: Date | null };
  vault: { id: string; revealDate: Date | null };
  userId: string;
}) {
  const { prisma } = await import("@/lib/prisma");
  const vaultRevealDate = vault.revealDate?.toISOString() ?? null;

  const [vaultEntries, vaultCollections, pendingEntries, latestDraft] =
    await Promise.all([
      prisma.entry.findMany({
        where: {
          vaultId: vault.id, collectionId: null, isSealed: true,
          approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.collection.findMany({
        where: { vaultId: vault.id },
        include: {
          _count: { select: { entries: { where: { isSealed: true, approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] } } } } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.entry.findMany({
        where: { vaultId: vault.id, isSealed: true, approvalStatus: "PENDING_REVIEW" },
        include: { contributor: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.entry.findFirst({
        where: { vaultId: vault.id, authorId: user.id, isDraft: true, isSealed: false },
        orderBy: { updatedAt: "desc" },
        select: { id: true, title: true, updatedAt: true },
      }),
    ]);

  const pending: PendingEntry[] = pendingEntries.map((e: Record<string, unknown>) => ({
    id: e.id as string,
    title: e.title as string | null,
    type: e.type as "TEXT" | "PHOTO" | "VOICE" | "VIDEO",
    createdAt: (e.createdAt as Date).toISOString(),
    contributorName:
      ((e as Record<string, unknown>).contributor as Record<string, unknown> | null)?.name as string ??
      ((e as Record<string, unknown>).contributor as Record<string, unknown> | null)?.email as string ??
      "A contributor",
  }));

  const entries: EntryRow[] = vaultEntries.map((e: Record<string, unknown>) => ({
    id: e.id as string,
    type: e.type as "TEXT" | "PHOTO" | "VOICE" | "VIDEO",
    title: e.title as string | null,
    body: e.body as string | null,
    createdAt: (e.createdAt as Date).toISOString(),
    revealDate: e.revealDate ? (e.revealDate as Date).toISOString() : null,
  }));

  const collections: CollectionRow[] = vaultCollections.map((c: Record<string, unknown>) => ({
    id: c.id as string,
    title: c.title as string,
    description: c.description as string | null,
    coverEmoji: c.coverEmoji as string | null,
    revealDate: c.revealDate ? (c.revealDate as Date).toISOString() : null,
    isSealed: c.isSealed as boolean,
    entryCount: ((c._count as Record<string, number>)?.entries ?? 0),
  }));

  return (
    <main className="min-h-screen bg-cream flex flex-col overflow-x-hidden">
      <DashboardHeader />

      <div className="mx-auto max-w-[980px] w-full px-6 lg:px-10 pt-6 pb-8 flex-1">
        {/* Back to vault */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-mid hover:text-navy transition-colors mb-6"
        >
          <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
          Your Vault
        </Link>

        {/* Capsule header */}
        <h1 className="text-[28px] lg:text-[34px] font-extrabold text-navy tracking-[-0.5px] mb-1">
          {child.firstName}&rsquo;s Capsule
        </h1>
        {vaultRevealDate && (
          <p className="text-[14px] text-ink-mid mb-8">
            They&rsquo;ll open this on {formatLong(vaultRevealDate)}
          </p>
        )}

        <MemoryStarter
          childFirstName={child.firstName}
          vaultId={vault.id}
          vaultRevealDate={vaultRevealDate}
          childDateOfBirth={child.dateOfBirth?.toISOString() ?? null}
          draft={
            latestDraft
              ? { id: latestDraft.id, title: latestDraft.title, updatedAt: latestDraft.updatedAt.toISOString() }
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
            childId={child.id}
            childFirstName={child.firstName}
            childDateOfBirth={child.dateOfBirth?.toISOString() ?? null}
            vaultId={vault.id}
            revealDate={vaultRevealDate}
          />
        </div>

        <div className="mt-6">
          <h2 className="text-xl lg:text-2xl font-bold text-navy tracking-[-0.3px] mb-6">
            Moments you&rsquo;ve sealed for {child.firstName}
          </h2>

          <CollectionsSection
            collections={collections}
            vaultRevealDate={vaultRevealDate}
            vaultId={vault.id}
          />

          <EntryList
            entries={entries}
            childFirstName={child.firstName}
            revealDate={vaultRevealDate}
            vaultId={vault.id}
          />
        </div>
      </div>

      <Footer />
    </main>
  );
}

// ── Shared header ─────────────────────────────────────────────

function DashboardHeader() {
  return (
    <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-navy/[0.06]">
      <div className="mx-auto max-w-[980px] px-6 lg:px-10 py-4 flex items-center justify-between gap-6">
        <Link href="/dashboard" className="flex items-center shrink-0" aria-label="Your Vault">
          <LogoSvg variant="dark" width={130} height={26} />
        </Link>
        <div className="flex items-center gap-5">
          <Avatar />
        </div>
      </div>
    </header>
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
