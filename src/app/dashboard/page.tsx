import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";

import { EntryList, type EntryRow } from "@/components/dashboard/EntryList";
import { VaultHero } from "@/components/dashboard/VaultHero";
import { LogoSvg } from "@/components/ui/LogoSvg";

export const metadata = {
  title: "Your vault — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DashboardPage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  if (!process.env.DATABASE_URL) {
    return <DbMissing />;
  }

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      children: {
        include: {
          vault: {
            include: {
              entries: {
                orderBy: { createdAt: "desc" },
                take: 50,
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!user) redirect("/onboarding");

  const child = user.children[0];
  if (!child || !child.vault) redirect("/onboarding");

  const vault = child.vault;
  const entries: EntryRow[] = vault.entries.map((e) => ({
    id: e.id,
    type: e.type,
    title: e.title,
    body: e.body,
    createdAt: e.createdAt.toISOString(),
    revealDate: e.revealDate?.toISOString() ?? null,
  }));

  return (
    <main className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-navy/[0.06]">
        <div className="mx-auto max-w-[980px] px-6 lg:px-10 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center" aria-label="Your vault">
            <LogoSvg variant="dark" width={130} height={26} />
          </Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <section className="mx-auto max-w-[980px] px-6 lg:px-10 pt-8 lg:pt-10">
        <VaultHero
          childFirstName={child.firstName}
          revealDate={vault.revealDate?.toISOString() ?? null}
          entryCount={entries.length}
        />
      </section>

      <section className="mx-auto max-w-[980px] px-6 lg:px-10 pt-10 lg:pt-14 pb-24">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div>
            <h2 className="text-xl lg:text-2xl font-bold text-navy tracking-[-0.3px]">
              Sealed entries
            </h2>
            <p className="text-sm text-ink-mid mt-1">
              Your child will open these on reveal day.
            </p>
          </div>
          <Link
            href="/dashboard/new"
            className="bg-navy text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-navy-mid transition-colors"
          >
            + New entry
          </Link>
        </div>
        <EntryList
          entries={entries}
          childFirstName={child.firstName}
          revealDate={vault.revealDate?.toISOString() ?? null}
        />
      </section>
    </main>
  );
}

function DbMissing() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-extrabold text-navy mb-2 tracking-[-0.5px]">
          Database not reachable
        </h1>
        <p className="text-ink-mid">
          DATABASE_URL isn&rsquo;t set. Once Postgres is wired up on Railway,
          your vault will appear here.
        </p>
      </div>
    </main>
  );
}
