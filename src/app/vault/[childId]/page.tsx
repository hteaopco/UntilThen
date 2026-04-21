import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Eye, Plus } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { LogoSvg } from "@/components/ui/LogoSvg";
import { CapsuleHero } from "@/components/capsule-landing/CapsuleHero";
import { CollectionCard } from "@/components/capsule-landing/CollectionCard";
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
    <main className="min-h-screen bg-cream pb-16">
      {/* Standard header — logo left, avatar right (matches /dashboard). */}
      <header className="mx-auto max-w-[1020px] px-6 lg:px-10 pt-5 pb-3 flex items-center justify-between gap-4">
        <Link href="/dashboard" aria-label="Back to your vault">
          <LogoSvg variant="dark" width={120} height={24} />
        </Link>
        <div className="[&>div>button]:w-8 [&>div>button]:h-8 [&>div>button]:text-[11px] sm:[&>div>button]:w-9 sm:[&>div>button]:h-9 sm:[&>div>button]:text-[13px]">
          <Avatar />
        </div>
      </header>

      <div className="mx-auto max-w-[1020px] px-6 lg:px-10 pt-2 sm:pt-4 space-y-8 sm:space-y-10">
        <CapsuleHero
          vaultId={vault.id}
          childFirstName={child.firstName}
          vaultCoverUrl={vault.coverUrl}
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

          <AddMemoryCta
            vaultId={vault.id}
            childId={child.id}
            childFirstName={child.firstName}
          />
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
function AddMemoryCta({
  vaultId: _vaultId,
  childId,
  childFirstName,
}: {
  vaultId: string;
  childId: string;
  childFirstName: string;
}) {
  return (
    <Link
      href={`/vault/${childId}/new`}
      prefetch={false}
      className="mt-4 flex items-center gap-4 rounded-2xl border-2 border-dashed border-amber/40 bg-white/60 px-5 py-4 hover:bg-white hover:border-amber/60 transition-colors group"
    >
      <span
        aria-hidden="true"
        className="shrink-0 w-11 h-11 rounded-full border-2 border-amber/60 text-amber flex items-center justify-center"
      >
        <Plus size={20} strokeWidth={2} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[15px] sm:text-[16px] font-bold text-navy tracking-[-0.2px]">
          Add a new memory
        </div>
        <div className="text-[13px] text-ink-mid mt-0.5">
          Capture another meaningful moment for {childFirstName}.
        </div>
      </div>
      <ChevronRight
        size={18}
        strokeWidth={1.75}
        className="text-ink-light group-hover:text-amber transition-colors shrink-0"
        aria-hidden="true"
      />
    </Link>
  );
}

