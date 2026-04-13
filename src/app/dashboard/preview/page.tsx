import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { PreviewClient, type PreviewEntry } from "./PreviewClient";

export const metadata = {
  title: "Reveal preview — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PreviewPage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  if (!process.env.DATABASE_URL) redirect("/dashboard");

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      children: {
        include: {
          vault: {
            include: {
              entries: {
                orderBy: { createdAt: "asc" },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!user) redirect("/onboarding");

  const child = user.children[0];
  if (!child || !child.vault) redirect("/dashboard");

  const entries: PreviewEntry[] = child.vault.entries.map((e) => ({
    id: e.id,
    type: e.type,
    title: e.title,
    body: e.body,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <PreviewClient
      childFirstName={child.firstName}
      parentFirstName={user.firstName}
      revealDate={child.vault.revealDate?.toISOString() ?? null}
      entries={entries}
    />
  );
}
