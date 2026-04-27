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
 * This file is the design surface ONLY. The QR slot uses a
 * static placeholder — wiring to a real per-capsule QR is
 * intentionally deferred until the design is locked.
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
      {/* controls — hidden on print */}
      <div className="w-full max-w-[420px] flex justify-between items-center mb-5 print:hidden">
        <Link
          href={`/capsules/${id}`}
          className="rounded-full border border-[#d8dbe3] bg-white px-5 py-2 text-[#101936] font-semibold"
        >
          × Exit
        </Link>

        <PrintButton />
      </div>

      {/* card */}
      <div
        className="
          relative
          h-[calc(100svh-180px)]
          max-h-[640px]
          aspect-[5/7]
          bg-[#fbf8f3]
          border border-[#c1844f]
          rounded-[18px]
          px-8 py-9
          flex flex-col items-center
          overflow-hidden
          print:max-h-none print:h-screen print:w-full print:max-w-none print:border-0 print:rounded-none
        "
      >
        <div className="font-brush text-[#b9783f] text-[38px] leading-none mb-8">
          Share your
        </div>

        <div className="font-serif text-[#101936] text-center text-[48px] leading-[0.93] tracking-[-0.04em] mb-4">
          WEDDING<br />
          MEMORIES
        </div>

        <div className="flex items-center justify-center gap-4 mb-7">
          <div className="w-10 h-px bg-[#c1844f]" />
          <div className="text-[#c1844f] text-xl leading-none">♥</div>
          <div className="w-10 h-px bg-[#c1844f]" />
        </div>

        <div
          className="
            w-[67%]
            aspect-square
            rounded-[14px]
            border-[2px] border-[#c1844f]
            bg-white
            p-4
            flex items-center justify-center
            mb-6
          "
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrCodeUrl}
            alt="QR Code"
            className="w-full h-full object-contain"
          />
        </div>

        <div className="flex justify-center gap-9 text-[#c1844f] mb-4">
          <Camera className="w-5 h-5" strokeWidth={1.7} />
          <Video className="w-5 h-5" strokeWidth={1.7} />
          <Mic className="w-5 h-5" strokeWidth={1.7} />
          <PenLine className="w-5 h-5" strokeWidth={1.7} />
        </div>

        <div className="font-serif text-[#101936] text-[18px] tracking-[0.24em] leading-none">
          SCAN TO SHARE
        </div>

        <div className="text-[#c1844f] text-base mt-2">♥</div>
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
