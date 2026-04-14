import { auth } from "@clerk/nextjs/server";
import { ChevronRight, UsersRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AddChildButton } from "@/components/account/AddChildButton";

export const metadata = {
  title: "Children & Vaults — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function formatLong(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function AccountChildrenPage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/dashboard");

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      children: {
        include: {
          vault: {
            include: {
              _count: {
                select: {
                  entries: {
                    where: {
                      isSealed: true,
                      approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!user) redirect("/onboarding");

  return (
    <div className="space-y-8">
      <section>
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-3">
          Children &amp; Vaults
        </p>
        <h2 className="text-2xl font-extrabold text-navy tracking-[-0.3px] mb-2">
          Who you&rsquo;re writing for
        </h2>
        <p className="text-sm text-ink-mid">
          Manage each child&rsquo;s vault, reveal date, and the trusted person
          who can request transfer if you&rsquo;re ever unable to access your
          account.
        </p>
      </section>

      <ul className="space-y-3">
        {user.children.map((child) => {
          const sealed = child.vault?._count.entries ?? 0;
          const reveal = child.vault?.revealDate?.toISOString() ?? null;
          return (
            <li key={child.id}>
              <Link
                href={`/account/children/${child.id}`}
                prefetch={false}
                className="group flex items-start gap-4 rounded-2xl border border-navy/[0.08] bg-white px-5 py-4 hover:border-amber/30 hover:shadow-[0_6px_20px_rgba(15,31,61,0.06)] transition-all"
              >
                <div
                  aria-hidden="true"
                  className="shrink-0 w-11 h-11 rounded-full bg-amber-tint text-amber flex items-center justify-center"
                >
                  <UsersRound size={18} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[17px] font-bold text-navy tracking-[-0.2px]">
                    {child.firstName} {child.lastName}
                  </div>
                  <div className="text-sm text-ink-mid mt-0.5">
                    {reveal
                      ? `Vault opens ${formatLong(reveal)}`
                      : "Reveal date not set"}{" "}
                    ·{" "}
                    {sealed.toLocaleString()}{" "}
                    {sealed === 1 ? "moment" : "moments"} sealed
                  </div>
                </div>
                <ChevronRight
                  size={18}
                  strokeWidth={1.5}
                  className="text-ink-light group-hover:text-amber transition-colors mt-2"
                  aria-hidden="true"
                />
              </Link>
            </li>
          );
        })}

        <li>
          <AddChildButton />
        </li>
      </ul>

      <p className="text-xs italic text-ink-light">
        Additional child vaults will be $1.99 / month each when billing is
        live. No charge during the current beta.
      </p>
    </div>
  );
}
