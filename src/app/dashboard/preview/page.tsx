import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { r2IsConfigured, signGetUrl } from "@/lib/r2";

import {
  PreviewClient,
  type PreviewCollection,
  type PreviewEntry,
  type PreviewMedia,
} from "./PreviewClient";

export const metadata = {
  title: "Reveal preview — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DbEntry = {
  id: string;
  type: "TEXT" | "PHOTO" | "VOICE" | "VIDEO";
  title: string | null;
  body: string | null;
  createdAt: Date;
  mediaUrls: string[];
  mediaTypes: string[];
};

async function serialise(entry: DbEntry): Promise<PreviewEntry> {
  let media: PreviewMedia[] = [];
  if (r2IsConfigured() && entry.mediaUrls.length > 0) {
    media = await Promise.all(
      entry.mediaUrls.map(async (key, i) => ({
        url: await signGetUrl(key),
        kind: (entry.mediaTypes[i] ?? "photo") as PreviewMedia["kind"],
      })),
    );
  }
  return {
    id: entry.id,
    type: entry.type,
    title: entry.title,
    body: entry.body,
    createdAt: entry.createdAt.toISOString(),
    media,
  };
}

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
                where: {
                  collectionId: null,
                  isSealed: true,
                  approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] },
                },
                orderBy: { createdAt: "asc" },
              },
              collections: {
                include: {
                  entries: {
                    where: {
                      isSealed: true,
                      approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] },
                    },
                    orderBy: [
                      { orderIndex: "asc" },
                      { createdAt: "asc" },
                    ],
                  },
                },
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

  const standalone: PreviewEntry[] = await Promise.all(
    child.vault.entries.map(serialise),
  );

  const collections: PreviewCollection[] = await Promise.all(
    child.vault.collections.map(async (c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      coverEmoji: c.coverEmoji,
      revealDate: c.revealDate?.toISOString() ?? null,
      entries: await Promise.all(c.entries.map(serialise)),
    })),
  );

  return (
    <PreviewClient
      childFirstName={child.firstName}
      parentFirstName={user.firstName}
      revealDate={child.vault.revealDate?.toISOString() ?? null}
      standaloneEntries={standalone}
      collections={collections}
    />
  );
}
