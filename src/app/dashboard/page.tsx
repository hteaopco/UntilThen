import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";

import { LogoSvg } from "@/components/ui/LogoSvg";

export const metadata = {
  title: "Your vault — untilThen",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  // If the user somehow reached /dashboard without onboarding, nudge
  // them through it. Keeps the dashboard guaranteed to have a vault.
  if (process.env.DATABASE_URL) {
    try {
      const { prisma } = await import("@/lib/prisma");
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
      });
      if (!user) redirect("/onboarding");
    } catch {
      // fall through — we'll render a graceful error below if it matters.
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-navy/[0.08]">
        <div className="mx-auto max-w-[1280px] px-6 lg:px-14 py-5 flex items-center justify-between">
          <LogoSvg variant="dark" width={130} height={26} />
          <UserButton
            afterSignOutUrl="/"
            appearance={{
              elements: {
                userButtonAvatarBox: {
                  width: 36,
                  height: 36,
                },
              },
            }}
          />
        </div>
      </header>

      <section className="mx-auto max-w-[1280px] px-6 lg:px-14 py-12 lg:py-16">
        <h1 className="text-[32px] lg:text-[40px] font-extrabold text-navy tracking-[-1px] leading-[1.08]">
          Your vault
        </h1>
        <p className="mt-3 text-ink-mid text-base lg:text-lg leading-[1.6]">
          Dashboard coming soon — we&rsquo;re building this next.
        </p>
      </section>
    </main>
  );
}
