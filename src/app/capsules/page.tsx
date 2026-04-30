import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Heart } from "lucide-react";

import { GiftCapsuleReceivedCard } from "@/components/dashboard2/GiftCapsuleReceivedCard";
import { Footer } from "@/components/landing/Footer";
import { TopNav } from "@/components/ui/TopNav";
import { prisma } from "@/lib/prisma";
import { r2IsConfigured, signGetUrl } from "@/lib/r2";

export const metadata = {
  title: "Capsules Given to You — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Standalone listing of every Gift Capsule that's been saved to
 * the viewer's account. The dashboard's "Capsules Given to You"
 * rail caps at three and links here for the full list — the rail's
 * "View all" used to point at this URL but the page didn't exist
 * yet, so the link 404'd. Now it lists every saved received
 * capsule with a tap-to-open card pointing at /reveal/<accessToken>
 * (the recipient surface), instead of /capsules/<id> which is the
 * organiser-only overview.
 *
 * Roles other than `recipient` aren't currently meaningful here
 * (organisers already have their own dashboard rail + per-capsule
 * detail page), so the page treats any role param as a soft hint
 * and just lists received capsules. We can add new role-scoped
 * lists if/when the dashboard grows more "View all" entry points.
 */
export default async function CapsulesIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const { userId } = auth();
  if (!userId) {
    // Bounce through sign-in and back here so a deep link from a
    // share / email still lands the user where they expected to be.
    redirect("/sign-in?redirect_url=/capsules?role=recipient");
  }

  // The route currently only knows about the recipient list, so
  // ignore the param value and just read the role hint as a no-op
  // placeholder for future organiser/contributor lists. Touch
  // searchParams so the dynamic-rendering hook stays consistent
  // with whatever Next decides about lazy-evaluating the promise.
  await searchParams;

  const receivedCapsules = await prisma.memoryCapsule.findMany({
    where: { recipientClerkId: userId },
    orderBy: { revealDate: "asc" },
    select: {
      id: true,
      accessToken: true,
      title: true,
      coverUrl: true,
    },
  });

  // Stat pills mirror the dashboard rail — letters / photos /
  // voice notes per capsule. Letters count text-only memories so
  // the three pills stay distinct, identical to dashboard2-data's
  // own aggregateStats logic.
  const receivedIds = receivedCapsules.map((c) => c.id);
  const contributions =
    receivedIds.length === 0
      ? []
      : await prisma.capsuleContribution.findMany({
          where: {
            capsuleId: { in: receivedIds },
            approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] },
          },
          select: { capsuleId: true, type: true, mediaTypes: true },
        });
  const stats = new Map<
    string,
    { letters: number; photos: number; voices: number }
  >();
  for (const r of contributions) {
    const cur = stats.get(r.capsuleId) ?? { letters: 0, photos: 0, voices: 0 };
    const hasPhoto = r.type === "PHOTO" || r.mediaTypes.includes("photo");
    const hasVoice = r.type === "VOICE" || r.mediaTypes.includes("voice");
    const hasVideo = r.type === "VIDEO" || r.mediaTypes.includes("video");
    if (hasPhoto) cur.photos += 1;
    if (hasVoice) cur.voices += 1;
    if (r.type === "TEXT" && !hasPhoto && !hasVoice && !hasVideo) {
      cur.letters += 1;
    }
    stats.set(r.capsuleId, cur);
  }

  // Sign each capsule's cover key into a short-lived GET URL so
  // the card can render the actual image (matches the dashboard
  // rail's pattern). Misses fall through to null and the card's
  // gradient placeholder paints.
  const signedCovers = await Promise.all(
    receivedCapsules.map(async (c) => {
      if (!c.coverUrl || !r2IsConfigured()) {
        return { id: c.id, url: null as string | null };
      }
      try {
        return { id: c.id, url: await signGetUrl(c.coverUrl) };
      } catch {
        return { id: c.id, url: null as string | null };
      }
    }),
  );
  const coverById = new Map(signedCovers.map((s) => [s.id, s.url]));

  const cards = receivedCapsules.map((c) => {
    const s = stats.get(c.id) ?? { letters: 0, photos: 0, voices: 0 };
    return {
      id: c.id,
      accessToken: c.accessToken,
      title: c.title,
      coverUrl: coverById.get(c.id) ?? null,
      entryCount: s.letters,
      photoCount: s.photos,
      voiceCount: s.voices,
    };
  });

  return (
    <>
      <TopNav />
      <main className="mx-auto max-w-[840px] px-6 lg:px-10 pt-6 pb-12">
        <Link
          href="/dashboard"
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-mid hover:text-navy mb-4"
        >
          <ArrowLeft size={14} strokeWidth={1.75} aria-hidden="true" />
          Dashboard
        </Link>
        <header className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber inline-flex items-center gap-1.5">
            <Heart size={12} strokeWidth={2.25} aria-hidden="true" />
            Capsules Given to You
          </p>
          <h1 className="mt-2 text-[26px] sm:text-[30px] font-extrabold text-navy tracking-[-0.5px]">
            {cards.length === 0
              ? "Nothing saved yet"
              : `${cards.length} saved capsule${cards.length === 1 ? "" : "s"}`}
          </h1>
        </header>
        {cards.length === 0 ? (
          <div className="rounded-2xl border border-navy/[0.06] bg-white p-8 text-center">
            <p className="text-[15px] text-ink-mid leading-[1.5]">
              When someone sends you a Gift Capsule and you save it, it&rsquo;ll
              show up here so you can revisit it any time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {cards.map((c) => (
              <GiftCapsuleReceivedCard key={c.id} capsule={c} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
