import { auth } from "@clerk/nextjs/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import {
  MediaDisplay,
  type MediaItem,
} from "@/components/editor/MediaDisplay";
import { r2IsConfigured, signGetUrl } from "@/lib/r2";

import { SealMomentActions } from "./SealMomentActions";

export const metadata = {
  title: "Proof read — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatShort(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLong(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ProofReadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/dashboard");

  const { id } = await params;

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

  const entry = await prisma.entry.findUnique({
    where: { id },
    include: {
      author: {
        select: { firstName: true, lastName: true, displayName: true },
      },
      collection: true,
    },
  });
  if (!entry) redirect("/dashboard");
  if (entry.authorId !== user.id) redirect("/dashboard");

  const vault = user.children[0]?.vault ?? null;

  const unlockDate =
    entry.revealDate ?? entry.collection?.revealDate ?? vault?.revealDate ?? null;

  const childFirstName = user.children[0]?.firstName ?? "them";

  const media: MediaItem[] = r2IsConfigured()
    ? await Promise.all(
        entry.mediaUrls.map(async (key, i): Promise<MediaItem> => ({
          url: await signGetUrl(key),
          kind: (entry.mediaTypes[i] ?? "photo") as MediaItem["kind"],
        })),
      )
    : [];

  return (
    <main className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-navy/[0.06]">
        <div className="mx-auto max-w-[720px] px-6 py-4 flex items-center justify-between gap-4">
          <Link
            href={`/dashboard/entry/${entry.id}/edit`}
            className="flex items-center gap-2 text-sm text-ink-mid hover:text-navy transition-colors"
          >
            <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>Return to Edit</span>
          </Link>
          <p className="text-[11px] uppercase tracking-[0.14em] text-gold font-bold">
            Preview
          </p>
          <span className="text-xs text-ink-light hidden sm:inline">
            How {childFirstName} will see this
          </span>
        </div>
      </header>

      <article className="mx-auto max-w-[720px] px-6 pt-10 pb-28">
        <div className="rounded-2xl bg-white border border-navy/[0.06] px-8 py-10 lg:px-12 lg:py-14 shadow-[0_20px_50px_-30px_rgba(15,31,61,0.25)]">
          {entry.title && (
            <h1 className="text-[32px] lg:text-[40px] font-extrabold tracking-[-0.6px] leading-[1.1] text-navy mb-6">
              {entry.title}
            </h1>
          )}
          {entry.body ? (
            <div
              className="tiptap-editor text-[17px] leading-[1.75] text-navy"
              dangerouslySetInnerHTML={{ __html: entry.body }}
            />
          ) : (
            <p className="text-ink-light italic">No body yet.</p>
          )}
          <MediaDisplay items={media} />
          <div className="mt-10 pt-6 border-t border-navy/[0.06] flex items-center justify-between gap-4 flex-wrap text-sm text-ink-mid">
            <div>
              — Written by{" "}
              <span className="font-semibold text-navy">
                {entry.author.displayName || entry.author.firstName}
              </span>{" "}
              · {formatShort(entry.createdAt)}
            </div>
            {unlockDate && (
              <div className="text-[11px] uppercase tracking-[0.12em] font-bold text-gold">
                Unlocks {formatShort(unlockDate)}
              </div>
            )}
          </div>
        </div>
      </article>

      <footer className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-navy/[0.08]">
        <div className="mx-auto max-w-[720px] px-6 py-3 flex items-center justify-between gap-3">
          <Link
            href={`/dashboard/entry/${entry.id}/edit`}
            prefetch={false}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-mid hover:text-navy transition-colors px-2 py-2"
          >
            <ArrowLeft size={16} strokeWidth={1.5} aria-hidden="true" />
            Return to Edit
          </Link>
          <SealMomentActions
            entryId={entry.id}
            entryTitle={entry.title ?? "Untitled"}
            childFirstName={childFirstName}
            unlockLabel={unlockDate ? formatLong(unlockDate) : "the vault reveal date"}
            isSealed={entry.isSealed}
          />
        </div>
      </footer>
    </main>
  );
}
