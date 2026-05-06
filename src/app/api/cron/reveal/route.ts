import { NextResponse } from "next/server";

import { cronRoute } from "@/lib/cron-run";
import { actualRevealMs } from "@/lib/reveal-schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    // Combine revealDate + deliveryTime + timezone via the
    // shared helper. The previous toLocaleString+setHours
    // approach silently rolled the date back one day in any
    // timezone behind UTC (revealDate is stored as UTC midnight,
    // and UTC midnight on April 29 is April 28 evening in CT)
    // so a same-day reveal could either fire 24 hours early or
    // never at all depending on tz. actualRevealMs uses
    // Intl.DateTimeFormat and is DST-aware.
    if (actualRevealMs(capsule) > now.getTime()) {
      skipped++;
      continue;
    }

    // Fan out to every recipient: the primary recipientEmail,
    // the legacy recipient2Email (still populated for couple
    // capsules created before multi-recipient shipped), and
    // every email in additionalRecipients (the JSON array used
    // by the new N-recipient flow). Deduped so an organiser who
    // accidentally enters the same address twice still only
    // gets one send.
    const extras = Array.isArray(capsule.additionalRecipients)
      ? (capsule.additionalRecipients as Array<{ email?: string }>).map(
          (r) => (typeof r?.email === "string" ? r.email : null),
        )
      : [];
    const recipients = Array.from(
      new Set(
        [capsule.recipientEmail, capsule.recipient2Email, ...extras]
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
          tone: capsule.tone,
          customSubject: capsule.revealEmailSubject,
          customBody: capsule.revealEmailBody,
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
