import { auth, clerkClient } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Gift, Lock, Settings } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { LogoSvg } from "@/components/ui/LogoSvg";
import { r2IsConfigured, signGetUrl } from "@/lib/r2";

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
    <main className="min-h-screen bg-cream flex flex-col">
      <header className="px-5 sm:px-8 py-5 flex items-center justify-between">
        <Link
          href="/account"
          aria-label="Settings"
          className="w-10 h-10 rounded-full bg-white border border-navy/[0.08] flex items-center justify-center shadow-[0_2px_6px_-2px_rgba(15,31,61,0.08)] hover:border-amber/30 transition-colors"
        >
          <Settings size={18} strokeWidth={1.5} className="text-navy" />
        </Link>
        <LogoSvg variant="dark" width={110} height={22} />
        <Avatar avatarUrl={avatarViewUrl} />
      </header>

      <section className="px-6 pt-6 sm:pt-10 pb-8 text-center">
        <h1 className="font-brush text-[44px] sm:text-[60px] leading-none text-navy">
          Hi, {firstName || "friend"}
          <span className="ml-2 align-middle text-amber text-[26px] sm:text-[34px]">
            ♡
          </span>
        </h1>
        <p className="mt-4 text-[15px] sm:text-[17px] text-navy/75 max-w-[340px] mx-auto leading-[1.45]">
          Every moment you save,
          <br />
          becomes timeless.
        </p>
      </section>

      <section className="flex-1 flex flex-col items-center justify-center gap-8 sm:gap-10 px-8 pb-10">
        <HomeBubble
          href="/dashboard"
          icon={<Lock size={32} strokeWidth={1.5} className="text-amber" />}
          title="Enter Your Vault"
          subtitle="Your memories, preserved."
        />
        <HomeBubble
          href="/capsules/new"
          icon={<Gift size={32} strokeWidth={1.5} className="text-amber" />}
          title="Create a Gift Capsule"
          subtitle="Create something unforgettable."
        />
      </section>

      <footer className="px-6 py-6 text-center">
        <p className="inline-flex items-center gap-1.5 text-[12px] text-navy/50">
          <span className="text-amber" aria-hidden="true">
            ♡
          </span>
          Made with love. Meant to last.
        </p>
      </footer>
    </main>
  );
}

function HomeBubble({
  href,
  icon,
  title,
  subtitle,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group w-[260px] h-[260px] sm:w-[300px] sm:h-[300px] rounded-full bg-gradient-to-br from-amber-tint/70 via-white to-amber-tint/30 border-2 border-amber/20 shadow-[0_10px_28px_-8px_rgba(196,122,58,0.22)] flex flex-col items-center justify-center gap-3 text-center px-8 hover:border-amber/40 hover:shadow-[0_14px_36px_-8px_rgba(196,122,58,0.32)] active:scale-[0.98] transition-all"
    >
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/70 border border-amber/10 flex items-center justify-center shadow-inner">
        {icon}
      </div>
      <h2 className="font-bold text-[20px] sm:text-[22px] text-navy tracking-[-0.3px] leading-tight">
        {title}
      </h2>
      <p className="text-[13px] sm:text-[14px] text-navy/60 leading-[1.4]">
        {subtitle}
      </p>
    </Link>
  );
}
