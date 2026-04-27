import { auth } from "@clerk/nextjs/server";
import { Camera, Mic, PenLine, Video, X } from "lucide-react";
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
 * This file is the design surface ONLY. The QR slot uses the
 * placeholder /your-qr-code.png from the spec — wiring to a
 * real per-capsule QR is intentionally deferred until the
 * design is locked. Don't change that without a green light.
 *
 * Surrounding chrome (Exit pill, Print button) and print rules
 * sit outside the card so the printed output is just the card.
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

  return (
    <>
      {/* Top chrome — outside the card so it doesn't print. */}
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

      <div className="min-h-screen bg-[#f8f5f0] flex items-start justify-center p-4 pt-16 print:p-0 print:pt-0">
        <div
          className="
            relative
            w-full max-w-[420px]
            aspect-[5/7]
            bg-[#fbf8f3]
            border border-[#c1844f]
            rounded-[18px]
            px-8 py-10
            flex flex-col items-center
            overflow-hidden
            print:max-w-none print:w-full print:h-full print:border-0 print:rounded-none
          "
        >
          {/* Top Script */}
          <div
            className="
              font-brush
              text-[#b9783f]
              text-[42px]
              leading-none
              tracking-[-0.03em]
              mb-10
            "
          >
            Share your
          </div>

          {/* Main Title */}
          <div
            className="
              text-[#101936]
              font-serif
              text-center
              text-[54px]
              leading-[0.95]
              tracking-[-0.04em]
              mb-4
            "
          >
            WEDDING<br />
            MEMORIES
          </div>

          {/* Divider */}
          <div className="flex items-center justify-center gap-3 mb-7">
            <div className="w-9 h-px bg-[#c1844f]" />
            <div className="text-[#c1844f] text-xl leading-none">♥</div>
            <div className="w-9 h-px bg-[#c1844f]" />
          </div>

          {/* QR Box — placeholder until design lock. */}
          <div
            className="
              w-[78%]
              aspect-square
              bg-white
              border-[2px] border-[#c1844f]
              rounded-[14px]
              flex items-center justify-center
              p-5
              mb-8
            "
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/your-qr-code.png"
              alt="Wedding memories QR code"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Icons */}
          <div className="flex items-center justify-center gap-10 text-[#c1844f] mb-5">
            <Camera className="w-5 h-5" strokeWidth={1.7} />
            <Video className="w-5 h-5" strokeWidth={1.7} />
            <Mic className="w-5 h-5" strokeWidth={1.7} />
            <PenLine className="w-5 h-5" strokeWidth={1.7} />
          </div>

          {/* Bottom Text */}
          <div
            className="
              text-[#101936]
              font-serif
              text-[20px]
              tracking-[0.28em]
              leading-none
              text-center
            "
          >
            SCAN TO SHARE
          </div>

          <div className="text-[#c1844f] text-lg leading-none mt-2">♥</div>
        </div>
      </div>

      {/* Print rules — single 5×7 page, edge-to-edge, no chrome. */}
      <style>{`
        @media print {
          @page { size: 5in 7in; margin: 0; }
          html, body { background: white !important; }
        }
      `}</style>
    </>
  );
}
