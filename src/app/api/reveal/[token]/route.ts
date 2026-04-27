import { NextResponse } from "next/server";

import { tokenIsValid } from "@/lib/capsules";
import { captureServerEvent } from "@/lib/posthog-server";
import { r2IsConfigured, signGetUrl } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public: token-only recipient reveal endpoint.
 *
 * The new /reveal/[token] route uses this; the legacy
 * /capsule/[id]/open?t=token route is being redirected to
 * /reveal/{token} so existing magic-link emails keep working.
 *
 * Differences from /api/capsules/open/[id]:
 *   1. Token is the only URL component — looked up against the
 *      unique MemoryCapsule.accessToken column.
 *   2. Media URLs are pre-signed server-side so the recipient
 *      doesn't have to round-trip per attachment.
 *   3. Author avatar URLs are signed and joined in too — the
 *      reveal cards render the contributor's profile photo when
 *      they have one (initials fallback otherwise).
 *   4. firstOpenedAt is stamped only when the recipient is
 *      actually past the reveal date — same as the legacy
 *      endpoint.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await ctx.params;
  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");
  const capsule = await prisma.memoryCapsule.findUnique({
    where: { accessToken: token },
    include: {
      contributions: {
        where: {
          approvalStatus: { in: ["AUTO_APPROVED", "APPROVED"] },
          // Don't expose items that haven't cleared Hive — even on
          // AUTO_APPROVED capsules, items in SCANNING or FLAGGED
          // states must stay hidden until moderation resolves.
          moderationState: { notIn: ["SCANNING", "FLAGGED"] },
        },
        orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!capsule) {
    return NextResponse.json(
      { error: "This capsule link isn't valid." },
      { status: 404 },
    );
  }
  if (!tokenIsValid(capsule)) {
    return NextResponse.json(
      { error: "This link has expired." },
      { status: 410 },
    );
  }
  if (capsule.revealDate.getTime() > Date.now()) {
    // Soft 200 with a sealed flag so the client can render the
    // "opens on {date}" screen instead of treating this as an
    // error condition. The contributions are stripped.
    return NextResponse.json({
      sealed: true,
      capsule: {
        id: capsule.id,
        title: capsule.title,
        recipientName: capsule.recipientName,
        revealDate: capsule.revealDate.toISOString(),
      },
    });
  }

  // Stamp first-open exactly once. Status flips to REVEALED so
  // the organiser dashboard reflects that the recipient has
  // actually opened it.
  let isFirstOpen = false;
  if (!capsule.firstOpenedAt) {
    await prisma.memoryCapsule.update({
      where: { id: capsule.id },
      data: { firstOpenedAt: new Date(), status: "REVEALED" },
    });
    isFirstOpen = true;
    await captureServerEvent(`recipient:${capsule.id}`, "capsule_opened", {
      capsuleId: capsule.id,
      contributionCount: capsule.contributions.length,
    });
  }

  const canSign = r2IsConfigured();

  // Batch-resolve avatar keys for every signed-in contributor in
  // one query, then sign the GET URLs in parallel.
  const contributorClerkIds = Array.from(
    new Set(
      capsule.contributions
        .map((c) => c.clerkUserId)
        .filter((v): v is string => !!v),
    ),
  );
  const avatarUrlByClerkId = new Map<string, string>();
  if (contributorClerkIds.length > 0 && canSign) {
    const authors = await prisma.user.findMany({
      where: { clerkId: { in: contributorClerkIds } },
      select: { clerkId: true, avatarUrl: true },
    });
    await Promise.all(
      authors
        .filter((a) => a.avatarUrl)
        .map(async (a) => {
          try {
            const url = await signGetUrl(a.avatarUrl!);
            avatarUrlByClerkId.set(a.clerkId, url);
          } catch {
            /* fall back to initials */
          }
        }),
    );
  }

  const contributions = await Promise.all(
    capsule.contributions.map(async (c) => {
      const media: { kind: "photo" | "voice" | "video"; url: string }[] = [];
      if (canSign) {
        for (let i = 0; i < c.mediaUrls.length; i++) {
          const key = c.mediaUrls[i];
          const rawKind = c.mediaTypes[i];
          if (rawKind !== "photo" && rawKind !== "voice" && rawKind !== "video")
            continue;
          try {
            const url = await signGetUrl(key);
            media.push({ kind: rawKind, url });
          } catch {
            /* skip */
          }
        }
      }

      return {
        id: c.id,
        authorName: c.authorName,
        authorAvatarUrl: c.clerkUserId
          ? avatarUrlByClerkId.get(c.clerkUserId) ?? null
          : null,
        type: c.type,
        title: c.title,
        body: c.body,
        media,
        createdAt: c.createdAt.toISOString(),
      };
    }),
  );

  return NextResponse.json({
    sealed: false,
    capsule: {
      id: capsule.id,
      title: capsule.title,
      recipientName: capsule.recipientName,
      occasionType: capsule.occasionType,
      tone: capsule.tone,
      revealDate: capsule.revealDate.toISOString(),
      isFirstOpen,
      // recipientCompletedAt is stamped by POST /api/reveal/
      // [token]/complete the first time the recipient reaches the
      // gallery. When already set, RevealExperience skips Phase 1
      // on subsequent loads and lands the returning viewer in the
      // gallery directly.
      hasCompleted: Boolean(capsule.recipientCompletedAt),
      // recipientClerkId is set by POST /api/capsules/[id]/save
      // once a recipient signs up + claims this capsule. Drives
      // the SavePromptScreen + gallery save banner — both are
      // suppressed once the capsule is permanently linked to an
      // account.
      isSaved: Boolean(capsule.recipientClerkId),
    },
    contributions,
  });
}
