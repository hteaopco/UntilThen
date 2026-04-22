import { auth } from "@clerk/nextjs/server";
import { ArrowLeft, Lock, Pencil } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { MediaDisplay, type MediaItem } from "@/components/editor/MediaDisplay";
import { TopNav } from "@/components/ui/TopNav";
import { formatLong } from "@/lib/dateFormatters";
import { r2IsConfigured, signGetUrl } from "@/lib/r2";

export const metadata = {
  title: "Memory — untilThen",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Read-only detail view for a single vault Entry. Reachable by
 * tapping any entry row on the Main Diary or a collection.
 *
 * Behaviour is the same before and after the reveal date — the
 * author (parent) can always re-read what they wrote. The only
 * thing the reveal date gates is the Edit button, which is hidden
 * once the recipient experience is frozen.
 */
export default async function EntryDetailPage({
  params,
}: {
  params: Promise<{ childId: string; entryId: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/dashboard");

  const { childId, entryId } = await params;

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!user) redirect("/onboarding");

  const entry = await prisma.entry.findUnique({
    where: { id: entryId },
    include: {
      vault: {
        include: {
          child: { select: { id: true, firstName: true, parentId: true } },
        },
      },
      collection: { select: { id: true, title: true, revealDate: true } },
    },
  });
  if (!entry || entry.vault.child.id !== childId) {
    redirect(`/vault/${childId}`);
  }
  if (entry.vault.child.parentId !== user.id) {
    redirect("/dashboard");
  }

  // Effective reveal date for the Edit button gate — matches the
  // same rule the editor + API both enforce.
  const effectiveReveal =
    entry.collection?.revealDate ?? entry.vault.revealDate ?? null;
  const pastReveal = Boolean(
    effectiveReveal && effectiveReveal.getTime() <= Date.now(),
  );

  // Sign media URLs so <MediaDisplay> can render photos / videos /
  // voice notes inline without re-fetching.
  const media: MediaItem[] = [];
  if (r2IsConfigured() && entry.mediaUrls.length > 0) {
    for (let i = 0; i < entry.mediaUrls.length; i++) {
      const key = entry.mediaUrls[i];
      const rawKind = entry.mediaTypes[i];
      if (rawKind !== "photo" && rawKind !== "voice" && rawKind !== "video")
        continue;
      try {
        media.push({ kind: rawKind, url: await signGetUrl(key) });
      } catch {
        /* skip media we can't sign */
      }
    }
  }

  const backHref = entry.collection
    ? `/vault/${childId}/collection/${entry.collection.id}`
    : `/vault/${childId}/diary`;
  const backLabel = entry.collection
    ? entry.collection.title
    : `${entry.vault.child.firstName}'s Diary`;

  const bodyHtml = entry.body ?? "";
  const bodyHasContent = bodyHtml.replace(/<[^>]+>/g, " ").trim().length > 0;

  return (
    <>
      <TopNav />
      <main className="min-h-screen bg-cream pb-20">
        <div className="mx-auto max-w-[720px] px-6 pt-4">
          <Link
            href={backHref}
            prefetch={false}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-ink-mid hover:text-navy transition-colors"
          >
            <ArrowLeft size={13} strokeWidth={2} aria-hidden="true" />
            Back to {backLabel}
          </Link>
        </div>

        <article className="mx-auto max-w-[720px] px-6 pt-6">
          {entry.collection && (
            <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber">
              In {entry.collection.title}
            </p>
          )}

          {entry.title && (
            <h1 className="mt-2 font-serif text-navy text-[28px] sm:text-[34px] leading-[1.15] tracking-[-0.4px]">
              {entry.title}
            </h1>
          )}

          <p className="mt-3 text-[12px] text-ink-light tracking-[0.04em]">
            Written {formatLong(entry.createdAt.toISOString())}
            {effectiveReveal && !pastReveal && (
              <>
                {" · "}
                <span className="inline-flex items-center gap-1 text-amber font-semibold">
                  <Lock size={10} strokeWidth={2} aria-hidden="true" />
                  Sealed until {formatLong(effectiveReveal.toISOString())}
                </span>
              </>
            )}
            {pastReveal && effectiveReveal && (
              <>
                {" · "}
                <span className="text-ink-mid font-semibold">
                  Revealed {formatLong(effectiveReveal.toISOString())}
                </span>
              </>
            )}
          </p>

          {bodyHasContent && (
            <div
              className="mt-6 font-serif text-navy text-[17px] leading-[1.7] [&_p]:mb-4 [&_p:last-child]:mb-0 [&_strong]:font-bold [&_em]:italic [&_a]:text-amber [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          )}

          {media.length > 0 && (
            <div className="mt-8">
              <MediaDisplay items={media} />
            </div>
          )}

          {!bodyHasContent && media.length === 0 && (
            <p className="mt-8 text-[14px] italic text-ink-light">
              This memory is empty.
            </p>
          )}

          <div className="mt-12 flex items-center gap-4">
            {!pastReveal && (
              <Link
                href={`/vault/${childId}/new?entry=${encodeURIComponent(entry.id)}`}
                prefetch={false}
                className="inline-flex items-center gap-2 rounded-lg bg-amber text-white px-5 py-2.5 text-[14px] font-bold hover:bg-amber-dark transition-colors"
              >
                <Pencil size={14} strokeWidth={2} aria-hidden="true" />
                Edit memory
              </Link>
            )}
            <Link
              href={backHref}
              prefetch={false}
              className="text-[13px] font-semibold text-ink-mid hover:text-navy transition-colors"
            >
              Back
            </Link>
          </div>
        </article>
      </main>
    </>
  );
}
