import { NextResponse, type NextRequest } from "next/server";

import { cronRoute } from "@/lib/cron-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isDeliveryTimePassed(
  revealDate: Date,
  deliveryTime: string,
  timezone: string,
): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(deliveryTime);
  const hours = match ? Number(match[1]) : 9;
  const minutes = match ? Number(match[2]) : 0;

  const nowInTz = new Date(
    new Date().toLocaleString("en-US", { timeZone: timezone }),
  );
  const revealInTz = new Date(
    revealDate.toLocaleString("en-US", { timeZone: timezone }),
  );

  revealInTz.setHours(hours, minutes, 0, 0);

  return nowInTz >= revealInTz;
}

export const POST = cronRoute("reveal", async (): Promise<NextResponse> => {
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

    if (
      !isDeliveryTimePassed(
        capsule.revealDate,
        capsule.deliveryTime,
        capsule.timezone,
      )
    ) {
      skipped++;
      continue;
    }

    // For couple capsules, both recipientEmail and recipient2Email
    // get a copy. We dedupe in case the user accidentally entered
    // the same address twice.
    const recipients = Array.from(
      new Set(
        [capsule.recipientEmail, capsule.recipient2Email]
          .filter((e): e is string => !!e)
          .map((e) => e.toLowerCase()),
      ),
    );

    try {
      for (const to of recipients) {
        await sendCapsuleRevealDay({
          to,
          recipientName: capsule.recipientName,
          title: capsule.title,
          capsuleId: capsule.id,
          accessToken: capsule.accessToken,
        });
      }

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
});
