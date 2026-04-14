import { auth } from "@clerk/nextjs/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { captureServerEvent } from "@/lib/posthog-server";
import { LockedVaultView } from "./LockedVaultView";

export const metadata = {
  title: "Your vault — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ChildViewPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/dashboard");

  const { childId } = await params;

  const { prisma } = await import("@/lib/prisma");
  // Access rules for this sprint: the parent of the child may view. A
  // future child-account flow will swap in an alternate check.
  const currentUser = await prisma.user.findUnique({
    where: { clerkId: userId },
  });
  if (!currentUser) redirect("/onboarding");

  const child = await prisma.child.findUnique({
    where: { id: childId },
    include: {
      vault: {
        include: {
          entries: {
            where: { isSealed: true, approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] } },
            include: {
              contributor: { select: { name: true, email: true } },
              author: { select: { firstName: true, displayName: true } },
            },
            orderBy: { createdAt: "asc" },
          },
          collections: {
            where: { isSealed: true },
            include: { _count: { select: { entries: true } } },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });
  if (!child) redirect("/dashboard");
  if (child.parentId !== currentUser.id) redirect("/dashboard");
  if (!child.vault) redirect("/dashboard");

  const entries = child.vault.entries.map((e) => ({
    id: e.id,
    type: e.type,
    author:
      e.contributor?.name ||
      e.contributor?.email ||
      e.author.displayName ||
      e.author.firstName ||
      "someone",
  }));
  const collections = child.vault.collections.map((c) => ({
    id: c.id,
    title: c.title,
    coverEmoji: c.coverEmoji,
    entryCount: c._count.entries,
  }));

  // Fire-and-forget so the page render isn't blocked on analytics.
  // Access here is the parent viewing the child's vault — future
  // child-account flow will surface a different viewerRole.
  void captureServerEvent(userId, "vault_viewed", {
    childId: child.id,
    vaultId: child.vault.id,
    viewerRole: "parent",
    entryCount: entries.length,
    collectionCount: collections.length,
  });

  return (
    <main className="min-h-screen bg-[#f5f7f0]">
      <header className="px-6 lg:px-10 py-5 flex items-center justify-between max-w-[720px] mx-auto">
        <Link
          href="/dashboard"
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-xs font-bold tracking-[0.12em] uppercase text-ink-light hover:text-navy transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
          Parent dashboard
        </Link>
        <p className="text-[10px] uppercase tracking-[0.16em] text-ink-light font-bold">
          Preview of child view
        </p>
      </header>

      <LockedVaultView
        childFirstName={child.firstName}
        revealDate={child.vault.revealDate?.toISOString() ?? null}
        entries={entries}
        collections={collections}
      />
    </main>
  );
}
