import { AdminHeader } from "@/app/admin/AdminHeader";
import { PreviewsClient } from "@/app/admin/previews/PreviewsClient";
import { signStockVoiceUrls } from "@/lib/elevenlabs";

export type { StockVoiceUrls } from "@/lib/elevenlabs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type RecentCapsule = {
  id: string;
  title: string;
  recipientName: string;
  status: string;
  accessToken: string;
  revealDate: string;
  isPaid: boolean;
  contributionCount: number;
};

export default async function AdminPreviewsPage() {
  let capsules: RecentCapsule[] = [];
  if (process.env.DATABASE_URL) {
    try {
      const { prisma } = await import("@/lib/prisma");
      const rows = await prisma.memoryCapsule.findMany({
        orderBy: { createdAt: "desc" },
        take: 25,
        select: {
          id: true,
          title: true,
          recipientName: true,
          status: true,
          accessToken: true,
          revealDate: true,
          isPaid: true,
          _count: { select: { contributions: true } },
        },
      });
      capsules = rows.map((r) => ({
        id: r.id,
        title: r.title,
        recipientName: r.recipientName,
        status: r.status,
        accessToken: r.accessToken,
        revealDate: r.revealDate.toISOString(),
        isPaid: r.isPaid,
        contributionCount: r._count.contributions,
      }));
    } catch (err) {
      console.error("[admin/previews] could not load capsules:", err);
    }
  }

  const stockVoices = await signStockVoiceUrls();

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <AdminHeader />
        <PreviewsClient capsules={capsules} stockVoices={stockVoices} />
      </div>
    </main>
  );
}
