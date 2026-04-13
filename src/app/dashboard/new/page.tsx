import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { NewEntryForm } from "./NewEntryForm";

export const metadata = {
  title: "Write a letter — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewEntryPage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  if (!process.env.DATABASE_URL) {
    redirect("/dashboard");
  }

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      children: {
        include: { vault: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!user) redirect("/onboarding");

  const child = user.children[0];
  if (!child || !child.vault) redirect("/onboarding");

  return (
    <NewEntryForm
      childFirstName={child.firstName}
      vaultRevealDate={child.vault.revealDate?.toISOString() ?? null}
    />
  );
}
