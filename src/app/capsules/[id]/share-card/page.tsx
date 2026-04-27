import { auth } from "@clerk/nextjs/server";
import { X } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { findOwnedCapsule } from "@/lib/capsules";

import { PrintButton } from "./PrintButton";

export const metadata = {
  title: "Share Card — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Organiser-only printable QR card for a wedding capsule.
 *
 * Phase 1 (this file): renders the static preview asset at
 * /public/wedding-table-card-preview.png so the organiser can
 * see the intended card and AirPrint it from their phone.
 *
 * The QR baked into the preview image is a placeholder. Phase 2
 * (blocked on design rights / final art lock) will overlay the
 * actual capsule-specific QR (pointing at /wedding/<guestToken>)
 * over the placeholder area in the image, so prints become
 * scannable for THIS wedding. The route, auth gate, print
 * chrome, and CSS @page rules below all carry over unchanged
 * — only the card body swaps out.
 *
 * Auth: organiser-only (findOwnedCapsule), wedding-only,
 * guestToken required. Anyone else gets bounced.
 */
export default async function ShareCardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const owned = await findOwnedCapsule(userId, id);
  if (!owned.ok) redirect("/dashboard");

  const { prisma } = await import("@/lib/prisma");
  const capsule = await prisma.memoryCapsule.findUnique({
    where: { id },
    select: { id: true, guestToken: true, occasionType: true },
  });
  if (!capsule || capsule.occasionType !== "WEDDING" || !capsule.guestToken) {
    redirect(`/capsules/${id}`);
  }

  return (
    <main className="min-h-screen bg-cream flex items-start justify-center p-4 print:p-0 print:bg-white">
      {/* Top chrome — hidden when printing. */}
      <div className="fixed top-0 inset-x-0 z-40 flex items-center justify-between gap-3 px-4 py-3 print:hidden">
        <Link
          href={`/capsules/${id}`}
          aria-label="Exit"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-navy/15 text-[12px] font-bold text-navy hover:border-navy/40 hover:bg-cream transition-colors"
        >
          <X size={12} strokeWidth={2.25} aria-hidden="true" />
          Exit
        </Link>
        <PrintButton />
      </div>

      {/* Phase 1 preview — the static PNG, sized to the same
          5×7 ratio the eventual JSX rebuild will use so the
          surrounding chrome doesn't shift when we swap. */}
      <div className="w-full max-w-[420px] mt-14 print:mt-0 print:max-w-none print:w-full print:h-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/wedding-table-card-preview.png"
          alt="Wedding memories — share card preview"
          className="w-full h-auto block rounded-[18px] border border-amber/30 shadow-[0_8px_32px_-8px_rgba(15,31,61,0.15)] print:rounded-none print:border-0 print:shadow-none"
        />
        <p className="mt-4 text-center text-[12px] text-ink-mid print:hidden">
          Preview only &mdash; the QR shown here is a placeholder.
          A capsule-specific scannable card is coming.
        </p>
      </div>

      {/* Print rules — single 5×7 page, edge-to-edge, no chrome. */}
      <style>{`
        @media print {
          @page { size: 5in 7in; margin: 0; }
          html, body { background: white !important; }
          body > *:not(main) { display: none !important; }
        }
      `}</style>
    </main>
  );
}
