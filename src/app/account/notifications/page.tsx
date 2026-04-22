import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { NotificationsForm } from "@/components/account/NotificationsForm";

export const metadata = {
  title: "Notifications — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AccountNotificationsPage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/dashboard");

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!user) redirect("/onboarding");

  const prefs = await prisma.notificationPreferences.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  return (
    <NotificationsForm
      initial={{
        writingReminders: prefs.writingReminders,
        milestoneReminders: prefs.milestoneReminders,
        vaultAnniversary: prefs.vaultAnniversary,
        revealCountdown: prefs.revealCountdown,
        pausedUntil: prefs.pausedUntil?.toISOString() ?? null,
      }}
    />
  );
}
