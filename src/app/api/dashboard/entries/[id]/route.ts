import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { scanEntryAsync } from "@/lib/entry-moderation";
import { userHasCapsuleAccess } from "@/lib/paywall";
import { captureServerEvent } from "@/lib/posthog-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PatchBody {
  title?: string | null;
  body?: string;
  revealDate?: string | null;
  collectionId?: string | null;
  isSealed?: boolean;
  isDraft?: boolean;
}

async function requireUser(clerkUserId: string) {
  const { prisma } = await import("@/lib/prisma");
  return prisma.user.findUnique({ where: { clerkId: clerkUserId } });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const user = await requireUser(userId);
    if (!user)
      return NextResponse.json({ error: "User not found." }, { status: 404 });

    // Content paywall — editing/saving entries requires an
    // active subscription. Creation path gates the same way in
    // /api/dashboard/entries POST.
    if (!(await userHasCapsuleAccess(user.id))) {
      return NextResponse.json(
        {
          error: "A subscription is required to edit memories.",
          needsSubscription: true,
        },
        { status: 402 },
      );
    }

    const entry = await prisma.entry.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        collectionId: true,
        isSealed: true,
        vaultId: true,
        type: true,
        vault: { select: { revealDate: true, isLocked: true } },
        collection: { select: { revealDate: true } },
      },
    });
    if (!entry)
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    if (entry.authorId !== user.id)
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    if (entry.vault?.isLocked) {
      return NextResponse.json(
        {
          error:
            "This capsule is locked. Unlock it or free up a slot to keep editing.",
          vaultLocked: true,
        },
        { status: 402 },
      );
    }

    // Once an entry's effective reveal date has passed, the
    // recipient experience is frozen — no edits to body, title,
    // collection, etc. (Approval flips are still allowed; those
    // come from the parent's review queue and don't change what
    // the recipient sees post-reveal.) Effective reveal date =
    // collection.revealDate when in a collection, otherwise
    // vault.revealDate.
    const isContentEdit =
      "title" in body ||
      "body" in body ||
      "collectionId" in body ||
      "revealDate" in body;
    if (isContentEdit) {
      const effectiveReveal =
        entry.collection?.revealDate ?? entry.vault?.revealDate ?? null;
      if (effectiveReveal && effectiveReveal.getTime() <= Date.now()) {
        return NextResponse.json(
          {
            error:
              "This memory has already been revealed and can no longer be edited.",
          },
          { status: 403 },
        );
      }
    }

    const data: Record<string, unknown> = {};
    if ("title" in body) {
      const t = typeof body.title === "string" ? body.title.trim() : "";
      data.title = t || null;
    }
    if ("body" in body) {
      data.body =
        typeof body.body === "string" && body.body.length > 0
          ? body.body
          : null;
    }
    if ("collectionId" in body) {
      const coll =
        typeof body.collectionId === "string" && body.collectionId.trim()
          ? body.collectionId.trim()
          : null;
      if (coll) {
        const c = await prisma.collection.findUnique({ where: { id: coll } });
        if (!c || c.authorId !== user.id)
          return NextResponse.json(
            { error: "Collection not found." },
            { status: 404 },
          );
      }
      data.collectionId = coll;
      // Clear per-entry reveal date when attached to a collection.
      if (coll) data.revealDate = null;
    }
    if ("revealDate" in body && !data.collectionId) {
      if (body.revealDate === null || body.revealDate === "") {
        data.revealDate = null;
      } else if (typeof body.revealDate === "string") {
        const parsed = new Date(body.revealDate);
        if (Number.isNaN(parsed.getTime()))
          return NextResponse.json(
            { error: "Invalid reveal date." },
            { status: 400 },
          );
        data.revealDate = parsed;
      }
    }
    if (typeof body.isSealed === "boolean") {
      data.isSealed = body.isSealed;
      if (body.isSealed === true) data.isDraft = false;
    }
    if (typeof body.isDraft === "boolean") {
      data.isDraft = body.isDraft;
    }

    // If the edit touches content (body / title), flip the
    // moderation state back to SCANNING and re-run Hive in the
    // background. Flag metadata is cleared to null so stale
    // scores don't stick around while the re-scan is in flight.
    // Pure sealing / collection-reassign PATCHes don't rescan.
    const contentChanged = "body" in body || "title" in body;
    if (contentChanged) {
      data.moderationState = "SCANNING";
      // Prisma nullable Json fields need JsonNull to clear;
      // bare null trips the InputJsonValue type check.
      data.moderationFlags = Prisma.JsonNull;
      data.moderationRunAt = null;
    }

    await prisma.entry.update({ where: { id }, data });

    if (contentChanged) {
      // Re-fetch the final body so the scan sees exactly what's
      // stored (covers the case where `data.body` was cleared
      // back to null or trimmed).
      const fresh = await prisma.entry.findUnique({
        where: { id },
        select: { body: true, mediaUrls: true, mediaTypes: true },
      });
      if (fresh) {
        void scanEntryAsync({
          entryId: id,
          body: fresh.body,
          mediaUrls: fresh.mediaUrls,
          mediaTypes: fresh.mediaTypes,
        });
      }
    }

    // Only fire entry_sealed on the transition false → true so
    // repeated "save" PATCHes (which can include isSealed: true
    // on an already-sealed entry) don't double-count.
    if (body.isSealed === true && !entry.isSealed) {
      await captureServerEvent(userId, "entry_sealed", {
        entryId: entry.id,
        vaultId: entry.vaultId,
        collectionId: entry.collectionId,
        type: entry.type,
        source: "patch",
      });
    }

    // Drop the dashboard's server cache so the patched entry
    // shows up immediately on router.refresh().
    revalidatePath("/dashboard");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[dashboard/entries PATCH] error:", err);
    return NextResponse.json(
      { error: "Couldn't save the entry." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    const { prisma } = await import("@/lib/prisma");
    const user = await requireUser(userId);
    if (!user)
      return NextResponse.json({ error: "User not found." }, { status: 404 });

    const entry = await prisma.entry.findUnique({
      where: { id },
      select: { id: true, authorId: true },
    });
    if (!entry)
      return NextResponse.json({ error: "Entry not found." }, { status: 404 });
    if (entry.authorId !== user.id)
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    await prisma.entry.delete({ where: { id } });
    // Invalidate the dashboard's cached server render so the
    // deleted entry disappears immediately on router.refresh().
    revalidatePath("/dashboard");
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[dashboard/entries DELETE] error:", err);
    return NextResponse.json(
      { error: "Couldn't delete the entry." },
      { status: 500 },
    );
  }
}
