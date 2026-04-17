import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });

  const { prisma } = await import("@/lib/prisma");

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const now = new Date();

  const users = await prisma.user.findMany({
    where: {
      children: { some: { vault: { isNot: null } } },
    },
    include: {
      children: {
        include: { vault: { select: { id: true } } },
      },
      notificationPreferences: { select: { writingReminders: true, pausedUntil: true } },
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const user of users) {
    const prefs = user.notificationPreferences;
    if (prefs?.pausedUntil && prefs.pausedUntil > now) { skipped++; continue; }
    if (prefs && !prefs.writingReminders) { skipped++; continue; }

    const vaultIds = user.children
      .filter((c) => c.vault)
      .map((c) => c.vault!.id);

    if (vaultIds.length === 0) { skipped++; continue; }

    const latestEntry = await prisma.entry.findFirst({
      where: { vaultId: { in: vaultIds }, authorId: user.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    if (latestEntry && latestEntry.createdAt > thirtyDaysAgo) {
      skipped++;
      continue;
    }

    try {
      const { clerkClient } = await import("@clerk/nextjs/server");
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(user.clerkId);
      const email =
        clerkUser.primaryEmailAddress?.emailAddress ??
        clerkUser.emailAddresses[0]?.emailAddress;

      if (email) {
        const { sendWritingReminder } = await import("@/lib/emails");
        const childName = user.children[0]?.firstName ?? "your child";
        await sendWritingReminder({ to: email, parentName: user.firstName, childName });
        sent++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`[cron/reminders] failed for user ${user.id}:`, err);
      skipped++;
    }
  }

  console.log(`[cron/reminders] ${users.length} users checked: ${sent} sent, ${skipped} skipped`);
  return NextResponse.json({ checked: users.length, sent, skipped });
}
