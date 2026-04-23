import { NextResponse, type NextRequest } from "next/server";

import { cronRoute } from "@/lib/cron-run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH_SIZE = 50;

export const POST = cronRoute("reminders", async (): Promise<NextResponse> => {
  if (!process.env.DATABASE_URL)
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });

  const { prisma } = await import("@/lib/prisma");

  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
  const now = new Date();

  let cursor: string | undefined;
  let sent = 0;
  let skipped = 0;
  let checked = 0;

  while (true) {
    const users = await prisma.user.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      where: {
        children: { some: { vault: { isNot: null } } },
      },
      include: {
        children: {
          include: { vault: { select: { id: true, isLocked: true } } },
        },
        notificationPreferences: { select: { writingReminders: true, pausedUntil: true } },
      },
      orderBy: { id: "asc" },
    });

    if (users.length === 0) break;
    cursor = users[users.length - 1]!.id;
    checked += users.length;

    for (const user of users) {
      const prefs = user.notificationPreferences;
      if (prefs?.pausedUntil && prefs.pausedUntil > now) { skipped++; continue; }
      if (prefs && !prefs.writingReminders) { skipped++; continue; }

      // Only consider unlocked vaults — locked ones are
      // read-only so nudging their owner to "write a memory"
      // would be annoying spam they can't act on.
      const unlockedVaultIds = user.children
        .filter((c) => c.vault && !c.vault.isLocked)
        .map((c) => c.vault!.id);

      if (unlockedVaultIds.length === 0) { skipped++; continue; }
      const vaultIds = unlockedVaultIds;

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

    if (users.length < BATCH_SIZE) break;
  }

  console.log(`[cron/reminders] ${checked} users checked: ${sent} sent, ${skipped} skipped`);
  return NextResponse.json({ checked, sent, skipped });
});
