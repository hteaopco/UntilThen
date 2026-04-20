import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 48-hour reminder to invited contributors who haven't submitted yet.
// Runs daily; targets ACTIVE capsules whose contributorDeadline falls
// in ~48h (±12h) so each invite receives exactly one reminder.
const BATCH_SIZE = 50;
const REMIND_LEAD_MS = 48 * 3600000;
const WINDOW_HALF_MS = 12 * 3600000;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json({ error: "Database not configured." }, { status: 500 });

  const { prisma } = await import("@/lib/prisma");
  const now = Date.now();
  const windowStart = new Date(now + REMIND_LEAD_MS - WINDOW_HALF_MS);
  const windowEnd = new Date(now + REMIND_LEAD_MS + WINDOW_HALF_MS);

  let cursor: string | undefined;
  let sent = 0;
  let skipped = 0;
  let checkedCapsules = 0;

  while (true) {
    const capsules = await prisma.memoryCapsule.findMany({
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      where: {
        status: "ACTIVE",
        contributorDeadline: { gte: windowStart, lte: windowEnd },
      },
      include: {
        invites: {
          where: { status: { not: "REVOKED" } },
          select: { email: true, name: true, inviteToken: true },
        },
        contributions: {
          select: { authorEmail: true },
        },
      },
      orderBy: { id: "asc" },
    });

    if (capsules.length === 0) break;
    cursor = capsules[capsules.length - 1]!.id;
    checkedCapsules += capsules.length;

    for (const capsule of capsules) {
      const submittedEmails = new Set(
        capsule.contributions
          .map((c) => c.authorEmail?.toLowerCase())
          .filter((e): e is string => !!e),
      );

      const pending = capsule.invites.filter(
        (inv) => !submittedEmails.has(inv.email.toLowerCase()),
      );

      if (pending.length === 0) continue;

      const { sendCapsuleContributorReminder } = await import(
        "@/lib/capsule-emails"
      );

      for (const invite of pending) {
        try {
          await sendCapsuleContributorReminder({
            to: invite.email,
            contributorName: invite.name ?? null,
            title: capsule.title,
            recipientName: capsule.recipientName,
            inviteToken: invite.inviteToken,
          });
          sent++;
        } catch (err) {
          console.error(
            `[cron/capsule-contributor-reminder] failed for invite ${invite.inviteToken}:`,
            err,
          );
          skipped++;
        }
      }
    }

    if (capsules.length < BATCH_SIZE) break;
  }

  console.log(
    `[cron/capsule-contributor-reminder] ${checkedCapsules} capsules in window: ${sent} sent, ${skipped} failed`,
  );
  return NextResponse.json({ checkedCapsules, sent, skipped });
}
