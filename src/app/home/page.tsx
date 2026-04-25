import { auth, clerkClient } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Gift, Lock, Settings, Sparkles } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { LogoSvg } from "@/components/ui/LogoSvg";
import { r2IsConfigured, signGetUrl } from "@/lib/r2";

import { HomeCard } from "./HomeCard";

/**
 * Signed-in main landing. Deliberately separate from /dashboard so
 * we can evolve the vault surface independently of the "which
 * product do you want to use right now?" entry.
 *
 * Two big illustrated cards stacked vertically:
 *   VaultEnter.png   → /dashboard       (personal, private memories)
 *   GiftEnter.png    → /capsules/new    (shared, one-off)
 *
 * Text lives on the LEFT half of each card so the illustration on
 * the right of the image stays the visual anchor. This page is NOT
 * PIN-gated — that gate lives on /dashboard itself, so users always
 * see the welcoming landing first and authenticate into the vault
 * via the card.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Welcome — untilThen",
};

export default async function HomePage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/sign-in");

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, firstName: true, avatarUrl: true },
  });
  if (!user) redirect("/onboarding");

  let firstName = user.firstName?.trim() ?? "";
  if (!firstName) {
    try {
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId);
      firstName = clerkUser.firstName ?? "";
    } catch {
      /* degrade to generic greeting */
    }
  }

  let avatarViewUrl: string | null = null;
  if (user.avatarUrl && r2IsConfigured()) {
    try {
      avatarViewUrl = await signGetUrl(user.avatarUrl);
    } catch {
      /* ignore — Avatar falls back to initials */
    }
  }

  return (
    <main className="min-h-dvh bg-cream flex flex-col">
      <header className="px-5 sm:px-8 py-3 flex items-center justify-between">
        <Link
          href="/account"
          aria-label="Settings"
          className="w-9 h-9 rounded-full bg-white border border-navy/[0.08] flex items-center justify-center shadow-[0_2px_6px_-2px_rgba(15,31,61,0.08)] hover:border-amber/30 transition-colors"
        >
          <Settings size={16} strokeWidth={1.5} className="text-navy" />
        </Link>
        <LogoSvg variant="dark" width={100} height={20} />
        <Avatar avatarUrl={avatarViewUrl} />
      </header>

      <section className="px-6 pt-3 sm:pt-5 pb-7 sm:pb-9 text-center">
        <h1 className="font-brush text-[40px] sm:text-[54px] leading-none text-navy">
          Hi, {firstName || "friend"}
          <span className="ml-2 align-middle text-amber text-[22px] sm:text-[30px]">
            ♡
          </span>
        </h1>
        <p className="mt-2 sm:mt-3 text-[13px] sm:text-[15px] text-navy/75 max-w-[320px] mx-auto leading-[1.4]">
          Every moment you save,
          <br />
          becomes timeless.
        </p>
      </section>

      <section className="flex-1 flex flex-col gap-4 px-6 sm:px-8 pb-4 relative max-w-[576px] w-full mx-auto">
        <HomeCard
          href="/dashboard"
          imageSrc="/VaultEnter2.png"
          icon={<Lock size={22} strokeWidth={1.5} className="text-amber" />}
          title={
            <>
              Enter Your
              <br />
              Vault
            </>
          }
          subtitle={
            <>
              Your memories,
              <br />
              preserved.
            </>
          }
        />
        <HomeCard
          href="/capsules/new"
          imageSrc="/auto_crop%23TUFISHowSlgtN3cjMSMxZmExNmQzYjc2N2RkY2NmNmU5N2I5NTA2ODc0NDhlNiMxNTM2IyNUUkFOU0ZPUk1BVElPTl9SRVFVRVNU.png"
          icon={<Gift size={22} strokeWidth={1.5} className="text-amber" />}
          title="Create a Gift Capsule"
          subtitle="Create something unforgettable."
        />
      </section>

      <footer className="px-6 py-3 text-center">
        <p className="inline-flex items-center gap-1.5 text-[11px] text-navy/50">
          <span className="text-amber" aria-hidden="true">
            ♡
          </span>
          Made with love. Meant to last.
        </p>
      </footer>

      {/* Trailing cream spacer — iOS overscroll bounce lands on
          cream rather than white. Generous height so the footer
          doesn't hard-transition into a white edge below. */}
      <div aria-hidden="true" className="h-32 sm:h-48 bg-cream" />
    </main>
  );
}

/** Purely decorative sparkle. aria-hidden; size/class passed by caller. */
function Sparkle({ className, size }: { className?: string; size: number }) {
  return (
    <Sparkles
      aria-hidden="true"
      size={size}
      strokeWidth={1.5}
      className={`pointer-events-none ${className ?? ""}`}
    />
  );
}
