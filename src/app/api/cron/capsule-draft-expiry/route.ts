import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Warn organisers one day before their DRAFT capsule hits the 7-day
// expiry window. Runs daily; targets drafts aged 6–7 days old so each
// qualifying capsule gets exactly one reminder across its lifetime.
const BATCH_SIZE = 50;
const EXPIRY_WINDOW_MS = 7 * 86400000;
const WARN_WINDOW_MS = 6 * 86400000;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });

  const { prisma } = await import("@/lib/prisma");
  const now = Date.now();
  const warnWindowEnd = new Date(now - WARN_WINDOW_MS);
  const warnWindowStart = new Date(now - EXPIRY_WINDOW_MS);

  let cursor: string | undefined;
  let sent = 0;
  let skipped = 0;
  let checked = 0;

  while (true) {
    const drafts = await prisma.memoryCapsule.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      where: {
        status: "DRAFT",
        createdAt: { gte: warnWindowStart, lt: warnWindowEnd },
      },
      include: {
        organiser: { select: { clerkId: true, firstName: true } },
      },
      orderBy: { id: "asc" },
    });

    if (drafts.length === 0) break;
    cursor = drafts[drafts.length - 1]!.id;
    checked += drafts.length;

    for (const capsule of drafts) {
      try {
        const { clerkClient } = await import("@clerk/nextjs/server");
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(capsule.organiser.clerkId);
        const email =
          clerkUser.primaryEmailAddress?.emailAddress ??
          clerkUser.emailAddresses[0]?.emailAddress;

        if (!email) { skipped++; continue; }

        const { sendCapsuleDraftExpiring } = await import("@/lib/capsule-emails");
        const origin =
          process.env.NEXT_PUBLIC_APP_URL ?? "https://untilthenapp.io";
        await sendCapsuleDraftExpiring({
          to: email,
          title: capsule.title,
          dashboardUrl: `${origin}/capsules/${capsule.id}`,
        });
        sent++;
      } catch (err) {
        console.error(
          `[cron/capsule-draft-expiry] failed for capsule ${capsule.id}:`,
          err,
        );
        skipped++;
      }
    }

    if (drafts.length < BATCH_SIZE) break;
  }

  console.log(
    `[cron/capsule-draft-expiry] ${checked} drafts in window: ${sent} sent, ${skipped} skipped`,
  );
  return NextResponse.json({ checked, sent, skipped });
}
