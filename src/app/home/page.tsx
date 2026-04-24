import { auth, clerkClient } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Gift, Lock, Settings, Sparkles } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { LogoSvg } from "@/components/ui/LogoSvg";
import { r2IsConfigured, signGetUrl } from "@/lib/r2";

import { HomeBubble } from "./HomeBubble";

/**
 * Signed-in main landing. Deliberately separate from /dashboard so
 * we can evolve the vault surface independently of the "which
 * product do you want to use right now?" entry. Two bubbles: vault
 * (personal/private memories) and gift capsule (one-off, shared).
 *
 * This page is NOT PIN-gated — that gate lives on /dashboard itself,
 * so users always land here first, then authenticate into the
 * vault via the bubble.
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

      <section className="px-6 pt-3 sm:pt-5 pb-3 text-center">
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

      <section className="flex-1 flex flex-col items-center justify-center gap-5 sm:gap-7 px-6 pb-3 relative">
        {/* Decorative sparkles scattered around the bubbles. Purely
            aesthetic — aria-hidden so screen readers skip them. All
            held at the same 20% opacity so they read as a uniform
            ambient layer rather than a mix of weights. */}
        <Sparkle
          className="absolute top-[8%] left-[6%] text-amber/20"
          size={22}
        />
        <Sparkle
          className="absolute top-[38%] right-[5%] text-amber/20"
          size={18}
        />
        <Sparkle
          className="absolute bottom-[12%] left-[8%] text-amber/20"
          size={20}
        />
        <Sparkle
          className="absolute top-[60%] right-[8%] text-amber/20"
          size={14}
        />

        <HomeBubble
          href="/dashboard"
          icon={<Lock size={28} strokeWidth={1.5} className="text-amber" />}
          title="Enter Your Vault"
          subtitle="Your memories, preserved."
        />
        <HomeBubble
          href="/capsules/new"
          icon={<Gift size={28} strokeWidth={1.5} className="text-amber" />}
          title="Create a Gift Capsule"
          subtitle="Create something unforgettable."
        />
      </section>

      {/* Decorative image sitting under both bubbles, above the footer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/IMG_2492.png"
        alt=""
        aria-hidden="true"
        className="w-full h-auto block"
      />

      <footer className="px-6 py-3 text-center">
        <p className="inline-flex items-center gap-1.5 text-[11px] text-navy/50">
          <span className="text-amber" aria-hidden="true">
            ♡
          </span>
          Made with love. Meant to last.
        </p>
      </footer>

      {/* Trailing cream spacer — iOS overscroll bounce lands on
          cream rather than white. */}
      <div aria-hidden="true" className="h-16 sm:h-24 bg-cream" />
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
