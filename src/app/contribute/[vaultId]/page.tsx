import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LogoSvg } from "@/components/ui/LogoSvg";

export const metadata = {
  title: "Contribute — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STATUS_LABELS: Record<
  "PENDING_REVIEW" | "AUTO_APPROVED" | "APPROVED" | "REJECTED",
  { label: string; className: string }
> = {
  AUTO_APPROVED: {
    label: "Published",
    className: "text-green-700 bg-green-50",
  },
  APPROVED: { label: "Published", className: "text-green-700 bg-green-50" },
  PENDING_REVIEW: {
    label: "Awaiting approval",
    className: "text-gold bg-gold-tint",
  },
  REJECTED: { label: "Rejected", className: "text-red-700 bg-red-50" },
};

function formatShort(iso: Date): string {
  return iso.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ContributePage({
  params,
}: {
  params: Promise<{ vaultId: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/");

  const { vaultId } = await params;

  const { prisma } = await import("@/lib/prisma");
  const contributor = await prisma.contributor.findFirst({
    where: { vaultId, clerkUserId: userId, status: "ACTIVE" },
    include: {
      vault: {
        include: { child: true },
      },
    },
  });
  if (!contributor) redirect("/");

  const entries = await prisma.entry.findMany({
    where: { contributorId: contributor.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-white">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-navy/[0.06]">
        <div className="mx-auto max-w-[720px] px-6 lg:px-10 py-4 flex items-center justify-between">
          <Link href="/" aria-label="untilThen home" className="flex items-center">
            <LogoSvg variant="dark" width={130} height={26} />
          </Link>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      <section className="mx-auto max-w-[720px] px-6 lg:px-10 pt-10 lg:pt-14 pb-10">
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-sky mb-3">
          Contributing to
        </p>
        <h1 className="text-[32px] lg:text-[40px] font-extrabold text-navy leading-[1.05] tracking-[-0.8px] mb-2">
          {contributor.vault.child.firstName}&rsquo;s vault
        </h1>
        {contributor.vault.revealDate && (
          <p className="text-ink-mid">
            Opens{" "}
            {contributor.vault.revealDate.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}

        <div className="mt-6">
          <Link
            href={`/contribute/${vaultId}/new`}
            className="inline-block bg-navy text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-navy-mid transition-colors"
          >
            + Add a memory
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-[720px] px-6 lg:px-10 pb-24">
        <h2 className="text-lg font-bold text-navy mb-5">Your contributions</h2>
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-navy/[0.08] bg-[#f8fafc] px-8 py-12 text-center">
            <p className="text-ink-mid">
              You haven&rsquo;t added anything yet.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {entries.map((e) => {
              const status =
                STATUS_LABELS[e.approvalStatus as keyof typeof STATUS_LABELS];
              return (
                <li
                  key={e.id}
                  className="rounded-2xl border border-navy/[0.08] bg-white px-5 py-4 flex items-start justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.12em] font-bold text-sky mb-1">
                      {e.type}
                    </div>
                    <div className="text-[15px] font-semibold text-navy truncate">
                      {e.title ?? "Untitled"}
                    </div>
                    <div className="text-xs text-ink-light mt-0.5">
                      Sealed {formatShort(e.createdAt)}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-[0.12em] font-bold px-2 py-1 rounded whitespace-nowrap ${status.className}`}
                  >
                    {status.label}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
