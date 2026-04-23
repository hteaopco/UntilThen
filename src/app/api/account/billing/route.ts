import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Billing API placeholder — real data will come from Square once
 * the integration lands. For now this returns usage counts derived
 * from the user's own records so the /account/billing page can
 * show meaningful numbers during dev.
 *
 * TODO: Connect Square billing API — plan, next billing date,
 * payment method, subscription status.
 */
export async function GET(): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      children: {
        include: {
          vault: {
            include: {
              entries: {
                where: { isDraft: false },
                select: { type: true, mediaTypes: true },
              },
            },
          },
        },
      },
    },
  });
  if (!user)
    return NextResponse.json({ error: "User not found." }, { status: 404 });

  const entries = user.children.flatMap((c) => c.vault?.entries ?? []);
  let photos = 0;
  let voiceNotes = 0;
  let videos = 0;
  for (const entry of entries) {
    for (const mt of entry.mediaTypes) {
      const m = mt.toLowerCase();
      if (m === "photo") photos += 1;
      else if (m === "voice") voiceNotes += 1;
      else if (m === "video") videos += 1;
    }
    if (entry.mediaTypes.length === 0) {
      if (entry.type === "PHOTO") photos += 1;
      else if (entry.type === "VOICE") voiceNotes += 1;
      else if (entry.type === "VIDEO") videos += 1;
    }
  }
  const usage = {
    childVaults: user.children.length,
    photos,
    voiceNotes,
    videos,
  };

  return NextResponse.json({
    plan: {
      name: "Base Plan",
      cadence: "Monthly",
      priceCents: 399,
      nextBillingDate: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    },
    usage,
    paymentMethod: null, // TODO: Square card brand + last4.
  });
}
