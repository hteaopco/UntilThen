import { auth, clerkClient } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoSvg } from "@/components/ui/LogoSvg";

export const metadata = {
  title: "Your Vault (v2) — untilThen",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function DashboardV2Page() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/");

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, firstName: true },
  });
  if (!user) redirect("/onboarding");

  // Fall back to Clerk for first name if the local record doesn't
  // have one yet (unlikely post-onboarding, but cheap to guard).
  let firstName = user.firstName?.trim() ?? "";
  if (!firstName) {
    try {
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId);
      firstName = clerkUser.firstName ?? "";
    } catch {
      // Non-fatal — greeting degrades to generic copy below.
    }
  }

  return (
    <main className="min-h-screen bg-cream">
      <header className="mx-auto max-w-[960px] px-6 lg:px-10 pt-6 pb-4 flex items-center justify-between">
        <Link href="/" aria-label="untilThen home">
          <LogoSvg variant="dark" width={120} height={24} />
        </Link>
        <Link
          href="/dashboard"
          prefetch={false}
          className="text-[12px] font-semibold text-ink-mid hover:text-navy transition-colors border border-navy/15 rounded-full px-3 py-1.5"
        >
          ↔ Compare to old dashboard
        </Link>
      </header>

      <section className="mx-auto max-w-[960px] px-6 lg:px-10 pt-6">
        <h1 className="font-brush text-[48px] sm:text-[56px] leading-none text-navy">
          {firstName ? `Hi, ${firstName}` : "Welcome back"} ♡
        </h1>
        <p className="mt-4 text-[18px] sm:text-[20px] leading-[1.4] text-navy max-w-[520px]">
          Every moment you capture becomes something unforgettable.
        </p>
      </section>
    </main>
  );
}
