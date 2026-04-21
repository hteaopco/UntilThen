import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Eye, Heart, Plus } from "lucide-react";

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
        <div className="[&_button]:w-8 [&_button]:h-8 [&_button]:text-[11px] sm:[&_button]:w-9 sm:[&_button]:h-9 sm:[&_button]:text-[13px]">
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
                    collection={c}
                    age={ageOnDate(child.dateOfBirth, c.revealDate)}
                  />
                </li>
              ))}
            </ul>
          )}

          <AddMilestoneCta
            childId={child.id}
            childFirstName={child.firstName}
          />
        </section>

        <CapsuleFooter childFirstName={child.firstName} />
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

function AddMilestoneCta({
  childId,
  childFirstName,
}: {
  childId: string;
  childFirstName: string;
}) {
  return (
    <Link
      href={`/dashboard?vault=${childId}&new=collection`}
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
          Add a New Milestone Collection
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

function CapsuleFooter({ childFirstName }: { childFirstName: string }) {
  return (
    <aside className="rounded-2xl border border-amber/20 bg-white/70 overflow-hidden flex items-stretch">
      <div className="flex-1 flex items-start gap-4 px-5 py-4 sm:px-6 sm:py-5">
        <span
          aria-hidden="true"
          className="shrink-0 w-11 h-11 rounded-full border-2 border-amber/60 text-amber flex items-center justify-center"
        >
          <Heart size={20} strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="font-brush text-[20px] sm:text-[22px] text-navy leading-tight">
            One day, these moments will be her greatest gift.
          </p>
          <p className="text-[12px] sm:text-[13px] text-ink-mid italic mt-1">
            Made with love, to be opened with love.
          </p>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="hidden sm:block relative w-[220px] shrink-0 bg-gradient-to-br from-amber/15 via-cream to-gold/15"
      >
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="w-full max-w-[180px] aspect-[4/3] rounded-lg bg-white/80 border border-amber/20 shadow-[0_2px_6px_rgba(196,122,58,0.12)] flex items-center justify-center">
            <span className="font-brush text-[18px] text-navy leading-tight px-4 text-center">
              To my {childFirstName},
              <br />
              <span className="text-amber">Love, Always</span>
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
