import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isDeliveryTimePassed(
  revealDate: Date,
  deliveryTime: string | null,
  timezone: string | null,
): boolean {
  const tz = timezone || "America/Chicago";
  const time = deliveryTime || "09:00";
  const [hours, minutes] = time.split(":").map(Number);

  const nowInTz = new Date(
    new Date().toLocaleString("en-US", { timeZone: tz }),
  );
  const revealInTz = new Date(
    revealDate.toLocaleString("en-US", { timeZone: tz }),
  );

  revealInTz.setHours(hours ?? 9, minutes ?? 0, 0, 0);

  return nowInTz >= revealInTz;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });
  }

  const { prisma } = await import("@/lib/prisma");
  const { sendCapsuleRevealDay } = await import("@/lib/capsule-emails");

  const now = new Date();

  const capsules = await prisma.memoryCapsule.findMany({
    where: {
      status: "ACTIVE",
      revealDate: { lte: now },
      firstOpenedAt: null,
      recipientEmail: { not: null },
    },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const capsule of capsules) {
    if (!capsule.recipientEmail) continue;

    if (!isDeliveryTimePassed(capsule.revealDate, capsule.deliveryTime, capsule.timezone)) {
      skipped++;
      continue;
    }

    try {
      await sendCapsuleRevealDay({
        to: capsule.recipientEmail,
        recipientName: capsule.recipientName,
        title: capsule.title,
        capsuleId: capsule.id,
        accessToken: capsule.accessToken,
      });

      await prisma.memoryCapsule.update({
        where: { id: capsule.id },
        data: { status: "SEALED" },
      });

      sent++;
    } catch (err) {
      console.error(`[cron/reveal] failed for capsule ${capsule.id}:`, err);
      failed++;
    }
  }

  console.log(
    `[cron/reveal] ${capsules.length} eligible: ${sent} sent, ${skipped} waiting for delivery time, ${failed} failed`,
  );

  return NextResponse.json({ processed: capsules.length, sent, skipped, failed });
}
