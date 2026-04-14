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

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ vault?: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  if (!process.env.DATABASE_URL) redirect("/dashboard");

  const { vault: vaultParam } = await searchParams;

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

  const childrenWithVaults = user.children.filter((c) => c.vault);
  if (childrenWithVaults.length === 0) redirect("/dashboard");

  // Same selection logic as /dashboard — URL param takes precedence,
  // otherwise the first child.
  const child =
    childrenWithVaults.find((c) => c.id === vaultParam) ??
    childrenWithVaults[0];
  const vault = child.vault!;

  const standalone: PreviewEntry[] = await Promise.all(
    vault.entries.map(serialise),
  );

  const collections: PreviewCollection[] = await Promise.all(
    vault.collections.map(async (c) => ({
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
      parentFirstName={user.displayName ?? user.firstName}
      revealDate={vault.revealDate?.toISOString() ?? null}
      standaloneEntries={standalone}
      collections={collections}
    />
  );
}
