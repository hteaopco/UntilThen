import { auth, clerkClient } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { DashboardGreeting } from "@/components/dashboard2/DashboardGreeting";
import { MobileTabBar } from "@/components/dashboard2/MobileTabBar";
import { LogoSvg } from "@/components/ui/LogoSvg";
import { countDashboardUpdates } from "@/lib/dashboard-updates";

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

  const updatesCount = await countDashboardUpdates(user.id);

  return (
    <main className="min-h-screen bg-cream pb-[120px] md:pb-10">
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

      <div className="mx-auto max-w-[960px] px-6 lg:px-10 pt-4">
        <DashboardGreeting firstName={firstName} updatesCount={updatesCount} />
      </div>

      <MobileTabBar />
    </main>
  );
}
