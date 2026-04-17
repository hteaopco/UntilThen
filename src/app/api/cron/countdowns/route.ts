import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MILESTONES = [30, 7, 1] as const;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });

  const { prisma } = await import("@/lib/prisma");
  const now = new Date();
  let sent = 0;
  let skipped = 0;

  for (const days of MILESTONES) {
    const targetDate = new Date(now.getTime() + days * 86400000);
    const windowStart = new Date(targetDate);
    windowStart.setHours(0, 0, 0, 0);
    const windowEnd = new Date(targetDate);
    windowEnd.setHours(23, 59, 59, 999);

    const vaults = await prisma.vault.findMany({
      where: {
        revealDate: { gte: windowStart, lte: windowEnd },
        unlockedAt: null,
      },
      include: {
        child: {
          include: {
            parent: {
              include: {
                notificationPreferences: { select: { revealCountdown: true, pausedUntil: true } },
              },
            },
          },
        },
      },
    });

    for (const vault of vaults) {
      const parent = vault.child.parent;
      const prefs = parent.notificationPreferences;

      if (prefs?.pausedUntil && prefs.pausedUntil > now) { skipped++; continue; }
      if (prefs && !prefs.revealCountdown) { skipped++; continue; }

      try {
        const { clerkClient } = await import("@clerk/nextjs/server");
        const clerk = await clerkClient();
        const clerkUser = await clerk.users.getUser(parent.clerkId);
        const email =
          clerkUser.primaryEmailAddress?.emailAddress ??
          clerkUser.emailAddresses[0]?.emailAddress;

        if (email) {
          const { sendRevealCountdown } = await import("@/lib/emails");
          await sendRevealCountdown({
            to: email,
            parentName: parent.firstName,
            childName: vault.child.firstName,
            daysLeft: days,
            revealDate: vault.revealDate!.toISOString(),
          });
          sent++;
        } else {
          skipped++;
        }
      } catch (err) {
        console.error(`[cron/countdowns] failed for vault ${vault.id}:`, err);
        skipped++;
      }
    }
  }

  console.log(`[cron/countdowns] ${sent} sent, ${skipped} skipped`);
  return NextResponse.json({ sent, skipped });
}
