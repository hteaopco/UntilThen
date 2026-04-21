import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  AudioLines,
  BookHeart,
  FileText,
  Image as ImageIcon,
  ImagePlus,
  Pencil,
  Plus,
  Video,
} from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { LogoSvg } from "@/components/ui/LogoSvg";
import { formatLong } from "@/lib/dateFormatters";

export const metadata = {
  title: "Main Capsule Diary — untilThen",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lightweight list view of all sealed + approved entries in a vault
 * that aren't attached to a named Collection. Acts as the landing
 * for the synthetic "Main Capsule Diary" card on /vault/[childId].
 *
 * Each row shows the entry's title (or a body snippet fallback),
 * the date it was sealed, and compact media-type stats. No detail
 * view yet — tapping a row currently stays on this page.
 */
export default async function MainDiaryPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/dashboard");

  const { childId } = await params;

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!user) redirect("/onboarding");

  const child = await prisma.child.findUnique({
    where: { id: childId },
    include: { vault: true },
  });
  if (!child || child.parentId !== user.id || !child.vault) {
    redirect("/dashboard");
  }

  const entries = await prisma.entry.findMany({
    where: {
      vaultId: child.vault.id,
      collectionId: null,
      isSealed: true,
      approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] },
    },
    select: {
      id: true,
      title: true,
      body: true,
      type: true,
      mediaTypes: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-cream pb-16">
      <header className="mx-auto max-w-[720px] px-6 pt-5 pb-3 flex items-center justify-between gap-4">
        <Link href="/dashboard" aria-label="untilThen">
          <LogoSvg variant="dark" width={120} height={24} />
        </Link>
        <div className="[&>div>button]:w-8 [&>div>button]:h-8 [&>div>button]:text-[11px] sm:[&>div>button]:w-9 sm:[&>div>button]:h-9 sm:[&>div>button]:text-[13px]">
          <Avatar />
        </div>
      </header>

      <section className="mx-auto max-w-[720px] px-6 pt-2">
        <Link
          href={`/vault/${child.id}`}
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-ink-mid hover:text-navy transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={1.75} />
          Back to {child.firstName}&rsquo;s Time Capsule
        </Link>

        <div className="mt-3 flex items-stretch justify-between gap-4">
          <div className="flex-1 min-w-0 flex flex-col">
            <h1 className="text-[26px] sm:text-[32px] font-extrabold text-navy tracking-[-0.5px] leading-tight">
              Main Capsule Diary
            </h1>
            <p className="mt-1 text-[13px] sm:text-[14px] text-ink-mid">
              Memories for {child.firstName} that aren&rsquo;t tied to a
              specific collection.
            </p>
          </div>
          <div
            aria-hidden="true"
            className="shrink-0 w-[110px] sm:w-[140px] aspect-square rounded-2xl overflow-hidden border border-amber/30 bg-gradient-to-br from-amber/30 via-cream to-amber/15 flex items-center justify-center text-amber"
          >
            <BookHeart size={36} strokeWidth={1.5} />
          </div>
        </div>

        {/* Action pills under the header */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-navy/10 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-mid hover:text-amber hover:border-amber/40 transition-colors"
          >
            <Pencil size={13} strokeWidth={1.75} />
            Edit collection details
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-navy/10 bg-white px-3 py-1.5 text-[12px] font-semibold text-ink-mid hover:text-amber hover:border-amber/40 transition-colors"
          >
            <ImagePlus size={13} strokeWidth={1.75} />
            Edit collection image
          </button>
          <Link
            href={`/vault/${child.id}/new`}
            prefetch={false}
            className="ml-auto inline-flex items-center gap-1.5 bg-amber text-white px-3 py-1.5 rounded-full text-[12px] font-bold hover:bg-amber-dark transition-colors"
          >
            <Plus size={13} strokeWidth={2} />
            Add memory
          </Link>
        </div>

        <div className="mt-6">
          {entries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-navy/10 bg-white/60 px-6 py-10 text-center">
              <p className="text-[14px] text-ink-mid leading-[1.5]">
                Nothing in the diary yet. Tap &ldquo;Add memory&rdquo; to seal
                your first entry here.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {entries.map((e) => (
                <li key={e.id}>
                  <EntryRow
                    title={e.title}
                    body={e.body}
                    type={e.type}
                    mediaTypes={e.mediaTypes}
                    createdAt={e.createdAt.toISOString()}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

function EntryRow({
  title,
  body,
  type,
  mediaTypes,
  createdAt,
}: {
  title: string | null;
  body: string | null;
  type: string;
  mediaTypes: string[];
  createdAt: string;
}) {
  const snippet = (body ?? "").replace(/<[^>]*>/g, "").trim();
  const headline = title?.trim() || snippet.slice(0, 80) || "Untitled memory";
  const preview =
    title && snippet ? snippet.slice(0, 120) : !title ? snippet.slice(80, 200) : "";

  const hasPhoto = type === "PHOTO" || mediaTypes.includes("photo");
  const hasVideo = type === "VIDEO" || mediaTypes.includes("video");
  const hasVoice = type === "VOICE" || mediaTypes.includes("voice");
  const isLetter = type === "TEXT" && !hasPhoto && !hasVoice && !hasVideo;

  return (
    <article className="rounded-2xl border border-amber/20 bg-white shadow-[0_2px_10px_rgba(196,122,58,0.05)] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-[15px] sm:text-[16px] font-bold text-navy tracking-[-0.2px] leading-tight truncate">
          {headline}
        </h2>
        <span className="shrink-0 text-[11px] uppercase tracking-[0.08em] font-semibold text-ink-light">
          {formatLong(createdAt)}
        </span>
      </div>
      {preview && (
        <p className="mt-1.5 text-[13px] text-ink-mid leading-[1.5] line-clamp-2">
          {preview}
        </p>
      )}
      <div className="mt-3 flex items-center gap-4 text-ink-light">
        {isLetter && <TypeBadge icon={<FileText size={14} strokeWidth={1.75} />} label="Letter" />}
        {hasPhoto && <TypeBadge icon={<ImageIcon size={14} strokeWidth={1.75} />} label="Photo" />}
        {hasVideo && <TypeBadge icon={<Video size={14} strokeWidth={1.75} />} label="Video" />}
        {hasVoice && <TypeBadge icon={<AudioLines size={14} strokeWidth={1.75} />} label="Voice" />}
      </div>
    </article>
  );
}

function TypeBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium">
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}
