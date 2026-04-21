import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Eye } from "lucide-react";

import { CapsuleHero } from "@/components/capsule-landing/CapsuleHero";
import { CollectionCard } from "@/components/capsule-landing/CollectionCard";
import { TopNav } from "@/components/ui/TopNav";
import {
  ageOnDate,
  loadCapsuleLandingData,
} from "@/lib/capsule-landing-data";

export const metadata = {
  title: "Time Capsule — untilThen",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CapsuleLandingPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/dashboard");

  const { childId } = await params;
  const data = await loadCapsuleLandingData({ userId, childId });
  if (!data) redirect("/dashboard");

  const { child, vault, collections } = data;

  return (
    <main className="min-h-screen bg-cream pb-16 overflow-x-clip">
      <TopNav />

      <div className="mx-auto max-w-[1020px] px-5 sm:px-6 lg:px-10 pt-6 space-y-8 sm:space-y-10">
        <CapsuleHero
          vaultId={vault.id}
          childFirstName={child.firstName}
          vaultCoverUrl={vault.coverUrl}
          vaultRevealDate={vault.revealDate?.toISOString() ?? null}
        />

        <section>
          <div className="flex items-center justify-between gap-4 mb-5">
            <h2 className="text-[22px] sm:text-[26px] font-extrabold text-navy tracking-[-0.4px]">
              {child.firstName}&rsquo;s Collections
            </h2>
            <Link
              href="/dashboard/preview"
              prefetch={false}
              className="inline-flex items-center gap-2 text-[13px] font-semibold text-ink-mid hover:text-amber transition-colors whitespace-nowrap"
            >
              View combined preview
              <span className="w-7 h-7 rounded-full bg-amber-tint text-amber flex items-center justify-center">
                <Eye size={14} strokeWidth={1.75} />
              </span>
            </Link>
          </div>

          {collections.length === 0 ? (
            <EmptyCollections childFirstName={child.firstName} />
          ) : (
            <ul className="space-y-4">
              {collections.map((c) => (
                <li key={c.id}>
                  <CollectionCard
                    childId={child.id}
                    collection={c}
                    age={ageOnDate(child.dateOfBirth, c.revealDate)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function EmptyCollections({ childFirstName }: { childFirstName: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-navy/10 bg-white/60 px-6 py-10 text-center">
      <p className="text-[14px] text-ink-mid leading-[1.5]">
        No collections yet for {childFirstName}. Create your first milestone
        below to start collecting moments.
      </p>
    </div>
  );
}

/**
 * Routes to the vault's polished memory editor (modeled on the gift
 * capsule contributor form) without a collectionId, so new entries
 * land in the "Main Capsule Diary" bucket (collectionId: null).
 */
