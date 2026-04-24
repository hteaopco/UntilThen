import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { EntryType } from "@prisma/client";

import { scanEntryAsync } from "@/lib/entry-moderation";
import { userHasCapsuleAccess } from "@/lib/paywall";
import { captureServerEvent } from "@/lib/posthog-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  vaultId?: string;
  title?: string | null;
  body?: string;
  type?: string;
  revealDate?: string | null;
  collectionId?: string | null;
  isDraft?: boolean;
  isSealed?: boolean;
}

const VALID_TYPES: EntryType[] = ["TEXT", "PHOTO", "VOICE", "VIDEO"];

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const bodyText = typeof body.body === "string" ? body.body : "";
  const typeInput = typeof body.type === "string" ? body.type : "TEXT";
  const type = VALID_TYPES.includes(typeInput as EntryType)
    ? (typeInput as EntryType)
    : "TEXT";

  // POST is now an auto-save / draft creation endpoint. It's OK to
  // create an empty draft — the user may have only typed a title.
  const isSealed = body.isSealed === true;
  const isDraft = !isSealed;

  let revealDate: Date | null = null;
  if (typeof body.revealDate === "string" && body.revealDate.trim()) {
    const parsed = new Date(body.revealDate);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json(
        { error: "Invalid reveal date." },
        { status: 400 },
      );
    }
    revealDate = parsed;
  }

  const collectionId =
    typeof body.collectionId === "string" && body.collectionId.trim()
      ? body.collectionId.trim()
      : null;

  try {
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
    if (!user)
      return NextResponse.json({ error: "User not found." }, { status: 404 });

    // Content paywall. The capsule itself is free to create, but
    // writing entries requires an active subscription. Mirrored
    // client-side on the + buttons in CapsuleHero / CollectionCard
    // / CollectionLandingView, which pop a SubscriptionPromptModal
    // before navigating to the editor.
    if (!(await userHasCapsuleAccess(user.id))) {
      return NextResponse.json(
        {
          error: "A subscription is required to write new memories.",
          needsSubscription: true,
        },
        { status: 402 },
      );
    }
    const ownedVaults = user.children
      .map((c) => c.vault)
      .filter((v): v is NonNullable<typeof v> => Boolean(v));
    const vault =
      (body.vaultId && ownedVaults.find((v) => v.id === body.vaultId)) ||
      ownedVaults[0];
    if (!vault)
      return NextResponse.json({ error: "No vault yet." }, { status: 404 });
    // Locked vaults are read-only — the user's over-quota or has
    // manually locked this capsule. Entries on other (unlocked)
    // capsules still work.
    if (vault.isLocked) {
      return NextResponse.json(
        {
          error:
            "This capsule is locked. Unlock it or free up a slot to keep writing.",
          vaultLocked: true,
        },
        { status: 402 },
      );
    }

    let orderIndex: number | null = null;
    if (collectionId) {
      const collection = await prisma.collection.findUnique({
        where: { id: collectionId },
        include: { _count: { select: { entries: true } } },
      });
      if (
        !collection ||
        collection.authorId !== user.id ||
        collection.vaultId !== vault.id
      ) {
        return NextResponse.json(
          { error: "Collection not found." },
          { status: 404 },
        );
      }
      revealDate = null;
      orderIndex = collection._count.entries;
    }

    // If there's anything worth scanning (text body OR media),
    // create in SCANNING state and kick off Hive async. Empty
    // drafts with only a title don't need scanning — leave them
    // NOT_SCANNED until the user actually writes content, at
    // which point the PATCH path flips them to SCANNING.
    const hasScannableContent =
      Boolean(bodyText && bodyText.trim()) ||
      // mediaUrls aren't wired through on POST today (editor uploads
      // via PATCH after creation) but leave the check in place so the
      // shape matches and future callers don't silently skip the scan.
      false;

    const entry = await prisma.entry.create({
      data: {
        vaultId: vault.id,
        authorId: user.id,
        type,
        title: title || null,
        body: bodyText || null,
        revealDate,
        collectionId,
        orderIndex,
        isDraft,
        isSealed,
        approvalStatus: "AUTO_APPROVED",
        moderationState: hasScannableContent ? "SCANNING" : "NOT_SCANNED",
      },
    });

    if (hasScannableContent) {
      // Fire-and-forget scan — responds to the author instantly.
      // Vault + reveal queries filter out SCANNING so the entry
      // is invisible to readers until the scan resolves. The
      // /api/cron/moderation-cleanup cron reclaims anything
      // stuck >5 min as FAILED_OPEN.
      void scanEntryAsync({
        entryId: entry.id,
        body: bodyText || null,
        mediaUrls: [],
        mediaTypes: [],
      });
    }

    // entry_created fires exactly once, at create time, so
    // auto-save PATCH updates later don't double-count. If the
    // new entry was created already-sealed (rare — the
    // "Seal Moment" flow typically PATCHes after creating), also
    // fire entry_sealed so the funnel stays honest.
    await captureServerEvent(userId, "entry_created", {
      entryId: entry.id,
      vaultId: vault.id,
      collectionId,
      type,
      hasTitle: Boolean(entry.title),
      hasBody: Boolean(entry.body),
    });
    if (isSealed) {
      await captureServerEvent(userId, "entry_sealed", {
        entryId: entry.id,
        vaultId: vault.id,
        collectionId,
        type,
        source: "create",
      });
    }

    return NextResponse.json({ success: true, id: entry.id });
  } catch (err) {
    console.error("[dashboard/entries POST] error:", err);
    return NextResponse.json(
      { error: "Couldn't save your entry." },
      { status: 500 },
    );
  }
}
