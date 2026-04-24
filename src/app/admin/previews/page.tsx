import { AdminHeader } from "@/app/admin/AdminHeader";
import { PreviewsClient } from "@/app/admin/previews/PreviewsClient";
import { r2KeyForStockVoice } from "@/lib/elevenlabs";
import { r2IsConfigured, signGetUrl } from "@/lib/r2";

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

export type StockVoiceUrls = {
  vaultMom: string | null;
  capsuleBirthday: string | null;
};

async function signStockVoiceUrls(): Promise<StockVoiceUrls> {
  if (!r2IsConfigured()) {
    return { vaultMom: null, capsuleBirthday: null };
  }
  const [vaultMom, capsuleBirthday] = await Promise.all([
    signGetUrl(r2KeyForStockVoice("vault-mom")).catch(() => null),
    signGetUrl(r2KeyForStockVoice("capsule-birthday")).catch(() => null),
  ]);
  return { vaultMom, capsuleBirthday };
}

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
