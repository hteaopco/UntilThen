import { AdminHeader } from "@/app/admin/AdminHeader";
import { QAClient } from "@/app/admin/qa/QAClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdminQAPage() {
  if (!process.env.DATABASE_URL) {
    return (
      <main className="min-h-screen bg-white">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <AdminHeader />
          <p className="text-sm text-red-600">DATABASE_URL is not set.</p>
        </div>
      </main>
    );
  }

  const { prisma } = await import("@/lib/prisma");

  const capsules = await prisma.memoryCapsule.findMany({
    include: {
      organiser: { select: { firstName: true, lastName: true } },
      _count: { select: { contributions: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const items = capsules.map((c) => ({
    id: c.id,
    title: c.title,
    recipientName: c.recipientName,
    occasionType: c.occasionType,
    revealDate: c.revealDate.toISOString(),
    status: c.status,
    organiser: c.organiser
      ? `${c.organiser.firstName} ${c.organiser.lastName}`
      : "(account deleted)",
    contributionCount: c._count.contributions,
    accessToken: c.accessToken,
  }));

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <AdminHeader />
        <QAClient capsules={items} />
      </div>
    </main>
  );
}
