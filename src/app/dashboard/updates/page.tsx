import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { TopNav } from "@/components/ui/TopNav";
import { UpdatesList, type PendingUpdate } from "./UpdatesList";

export const metadata = {
  title: "Updates — untilThen",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Approval inbox for the signed-in user. Lists every
 * capsuleContribution whose approvalStatus is PENDING_REVIEW on a
 * capsule they organise, with per-row and bulk approve / deny
 * controls on the client side.
 */
export default async function UpdatesPage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/dashboard");

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!user) redirect("/onboarding");

  const pending = await prisma.capsuleContribution.findMany({
    where: {
      approvalStatus: "PENDING_REVIEW",
      capsule: { organiserId: user.id },
    },
    include: {
      capsule: { select: { id: true, title: true, recipientName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows: PendingUpdate[] = pending.map((c) => ({
    id: c.id,
    capsuleId: c.capsuleId,
    capsuleTitle: c.capsule.title,
    recipientName: c.capsule.recipientName,
    authorName: c.authorName,
    title: c.title,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <main className="min-h-screen bg-cream pb-16">
      <TopNav />
      <section className="mx-auto max-w-[760px] px-6 pt-6">
        <div className="mb-6">
          <h1 className="text-[26px] sm:text-[32px] font-extrabold text-navy tracking-[-0.5px] leading-tight">
            Updates
          </h1>
          <p className="mt-1 text-[13px] sm:text-[14px] text-ink-mid">
            {rows.length === 0
              ? "Nothing waiting for you — new contributions will show up here."
              : `${rows.length} ${rows.length === 1 ? "contribution is" : "contributions are"} waiting for your review.`}
          </p>
        </div>

        <UpdatesList rows={rows} />
      </section>
    </main>
  );
}
