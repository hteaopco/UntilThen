import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { ChildEditForm } from "@/components/account/ChildEditForm";

export const metadata = {
  title: "Time Capsule Details — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AccountChildEditPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/dashboard");

  const { childId } = await params;

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!user) redirect("/onboarding");

  const child = await prisma.child.findUnique({
    where: { id: childId },
    include: { vault: true },
  });
  if (!child || child.parentId !== user.id) redirect("/account/capsules");

  return (
    <ChildEditForm
      childId={child.id}
      firstName={child.firstName}
      dateOfBirth={child.dateOfBirth?.toISOString() ?? null}
      revealDate={child.vault?.revealDate?.toISOString() ?? null}
      trusteeName={child.trusteeName ?? ""}
      trusteeEmail={child.trusteeEmail ?? ""}
      trusteePhone={""}
      deliveryTime={child.vault?.deliveryTime ?? "08:00"}
    />
  );
}
