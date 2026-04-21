import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Legacy URL — the real collection landing lives under
 * /vault/{childId}/collection/{collectionId} now. Look the
 * collection up so we can forward the viewer to the right
 * child-scoped URL; unknown ids fall back to /dashboard.
 */
export default async function LegacyCollectionRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!process.env.DATABASE_URL) redirect("/dashboard");
  const { id } = await params;
  const { prisma } = await import("@/lib/prisma");
  const collection = await prisma.collection.findUnique({
    where: { id },
    select: { vault: { select: { child: { select: { id: true } } } } },
  });
  if (!collection) redirect("/dashboard");
  redirect(`/vault/${collection.vault.child.id}/collection/${id}`);
}
