import { auth, clerkClient } from "@clerk/nextjs/server";
import { EntryType } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import { findOwnedCapsule } from "@/lib/capsules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES: EntryType[] = ["TEXT", "PHOTO", "VOICE", "VIDEO"];

interface Body {
  type?: string;
  title?: string | null;
  body?: string;
  mediaUrls?: string[];
  mediaTypes?: string[];
}

/**
 * Organiser writes their own contribution to a capsule they own.
 * Available regardless of payment status — the organiser's
 * personal message is part of the free draft experience.
 *
 * The contribution is stamped with the organiser's clerkUserId
 * so subsequent edit / delete calls can scope cleanly.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  const { id } = await ctx.params;
  const owned = await findOwnedCapsule(userId ?? null, id);
  if (!owned.ok)
    return NextResponse.json({ error: "Not found." }, { status: owned.status });

  let payload: Body;
  try {
    payload = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = VALID_TYPES.includes(payload.type as EntryType)
    ? (payload.type as EntryType)
    : "TEXT";
  const title =
    typeof payload.title === "string" && payload.title.trim()
      ? payload.title.trim()
      : null;
  const text =
    typeof payload.body === "string" && payload.body.trim()
      ? payload.body
      : null;
  const mediaUrls = Array.isArray(payload.mediaUrls)
    ? payload.mediaUrls.filter((u): u is string => typeof u === "string")
    : [];
  const mediaTypes = Array.isArray(payload.mediaTypes)
    ? payload.mediaTypes.filter((u): u is string => typeof u === "string")
    : [];

  // Lighter content gate than the parent entry editor — the
  // organiser may want to start with just a title and add the
  // body / media later. Only fail when literally nothing's set.
  if (!title && !text && mediaUrls.length === 0) {
    return NextResponse.json(
      { error: "Add a title, message, or media." },
      { status: 400 },
    );
  }

  // Pull a friendly display name from Clerk so the organiser's
  // contribution shows up in the reveal experience attributed to
  // them (e.g. "From Alex"), not as an anonymous post. Fallback
  // is the org email if they haven't set a first name.
  let authorName = "You";
  let authorEmail: string | null = null;
  try {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId!);
    authorName =
      clerkUser.firstName ||
      clerkUser.username ||
      clerkUser.primaryEmailAddress?.emailAddress?.split("@")[0] ||
      "You";
    authorEmail =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress ??
      null;
  } catch {
    /* fall through with defaults */
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const contribution = await prisma.capsuleContribution.create({
      data: {
        capsuleId: id,
        authorName,
        authorEmail,
        clerkUserId: userId,
        type,
        title,
        body: text,
        mediaUrls,
        mediaTypes,
        // The organiser's own contributions are always
        // auto-approved — no point requiring them to approve
        // their own message.
        approvalStatus: "AUTO_APPROVED",
      },
    });
    return NextResponse.json({ success: true, id: contribution.id });
  } catch (err) {
    console.error("[capsule contributions POST] error:", err);
    return NextResponse.json(
      { error: "Couldn't save your contribution." },
      { status: 500 },
    );
  }
}
