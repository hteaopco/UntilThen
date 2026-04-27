import { auth } from "@clerk/nextjs/server";
import { Camera, Mic, PenLine, Video } from "lucide-react";
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
 * Organiser-only printable QR card design preview.
 *
 * Three-zone flex layout (top / middle / bottom) via
 * justify-between so the bottom row (icons + SCAN TO SHARE +
 * heart) is anchored to the card's lower edge regardless of
 * QR size or screen height. Prevents the previous bug where a
 * larger QR pushed the bottom content off the card on shorter
 * viewports.
 *
 * Design surface ONLY — QR slot uses a placeholder string;
 * wiring to a per-capsule QR comes after design lock.
 *
 * Auth: organiser-only (findOwnedCapsule), wedding-only.
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
    select: { id: true, occasionType: true, guestToken: true },
  });
  if (!capsule || capsule.occasionType !== "WEDDING" || !capsule.guestToken) {
    redirect(`/capsules/${id}`);
  }

  // Placeholder QR until design lock + wiring pass. Stays as a
  // string so swapping it later is a single-line change.
  const qrCodeUrl = "/your-qr-code.png";

  return (
    <div className="min-h-screen bg-[#f8f5f0] flex flex-col items-center px-4 pt-6 print:bg-white print:pt-0">
      {/* Controls — hidden on print */}
      <div className="w-full max-w-[420px] flex justify-between items-center mb-5 print:hidden">
        <Link
          href={`/capsules/${id}`}
          className="rounded-full border border-[#d8dbe3] bg-white px-5 py-2 text-[#101936] font-semibold"
        >
          × Exit
        </Link>
        <PrintButton />
      </div>

      {/* Card — three-zone flex with justify-between so bottom
          content is anchored, never pushed off. */}
      <div
        className="
          h-[calc(100svh-180px)]
          max-h-[640px]
          aspect-[5/7]
          bg-[#fbf8f3]
          border border-[#c1844f]
          rounded-[18px]
          px-8 py-8
          flex flex-col justify-between
          print:max-h-none print:h-screen print:w-full print:max-w-none print:border-0 print:rounded-none
        "
      >
        {/* TOP */}
        <div className="flex flex-col items-center">
          <div className="font-brush text-[#b9783f] text-[36px] mb-6">
            Share your
          </div>
          <div className="font-serif text-[#101936] text-center text-[46px] leading-[0.95] tracking-[-0.04em] mb-4">
            WEDDING<br />
            MEMORIES
          </div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-px bg-[#c1844f]" />
            <div className="text-[#c1844f] text-lg">♥</div>
            <div className="w-10 h-px bg-[#c1844f]" />
          </div>
        </div>

        {/* MIDDLE (QR) */}
        <div className="flex justify-center">
          <div className="w-[62%] aspect-square bg-white border-[2px] border-[#c1844f] rounded-[14px] p-4 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCodeUrl}
              alt="QR Code"
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* BOTTOM (LOCKED IN PLACE) */}
        <div className="flex flex-col items-center">
          <div className="flex gap-8 text-[#c1844f] mb-3">
            <Camera className="w-5 h-5" strokeWidth={1.7} />
            <Video className="w-5 h-5" strokeWidth={1.7} />
            <Mic className="w-5 h-5" strokeWidth={1.7} />
            <PenLine className="w-5 h-5" strokeWidth={1.7} />
          </div>
          <div className="font-serif text-[#101936] text-[16px] tracking-[0.25em]">
            SCAN TO SHARE
          </div>
          <div className="text-[#c1844f] text-sm mt-1">♥</div>
        </div>
      </div>

      {/* Print rules — single 5×7 page, edge-to-edge. */}
      <style>{`
        @media print {
          @page { size: 5in 7in; margin: 0; }
          html, body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
