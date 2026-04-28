import { NextResponse, type NextRequest } from "next/server";

import {
  MEDIA_LIMITS,
  buildMediaKey,
  r2IsConfigured,
  signPutUrl,
  signGetUrl,
  type MediaKind,
} from "@/lib/r2";
import { effectiveStatus } from "@/lib/capsules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_KINDS: MediaKind[] = ["photo", "voice", "video"];

async function resolveInvite(token: string) {
  const { prisma } = await import("@/lib/prisma");
  return prisma.capsuleInvite.findUnique({
    where: { inviteToken: token },
    include: { capsule: true },
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  if (!r2IsConfigured())
    return NextResponse.json({ error: "Media storage not configured." }, { status: 503 });

  const { token } = await ctx.params;
  const invite = await resolveInvite(token);
  if (!invite)
    return NextResponse.json({ error: "Invite not found." }, { status: 404 });

  const status = effectiveStatus(invite.capsule);
  if (invite.capsule.status === "DRAFT" || status === "SEALED" || status === "SENT" || status === "REVEALED")
    return NextResponse.json({ error: "Capsule is not accepting contributions." }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    contributionId?: string;
    kind?: string;
    contentType?: string;
    filename?: string;
    size?: number;
    key?: string;
    mediaKeys?: string[];
    mediaTypes?: string[];
  };

  if (body.action === "sign") {
    const kind = VALID_KINDS.includes(body.kind as MediaKind) ? (body.kind as MediaKind) : null;
    const contentType = typeof body.contentType === "string" ? body.contentType : "";
    const filename = typeof body.filename === "string" && body.filename ? body.filename : "upload";
    const size = typeof body.size === "number" ? body.size : 0;
    const contributionId = typeof body.contributionId === "string" ? body.contributionId : "";

    if (!kind || !contentType || !contributionId)
      return NextResponse.json({ error: "Missing kind, contentType, or contributionId." }, { status: 400 });

    const limit = MEDIA_LIMITS[kind];
    if (!contentType.startsWith(limit.prefix))
      return NextResponse.json({ error: `Content-Type must start with ${limit.prefix}` }, { status: 400 });
    if (size > limit.maxBytes)
      return NextResponse.json({ error: `File too large. Max is ${limit.maxBytes / (1024 * 1024)}MB.` }, { status: 413 });

    const key = buildMediaKey({ target: "capsuleContribution", id: contributionId, kind, filename });
    const uploadUrl = await signPutUrl(key, contentType);
    return NextResponse.json({ uploadUrl, key });
  }

  if (body.action === "complete") {
    const contributionId = typeof body.contributionId === "string" ? body.contributionId : "";
    const mediaKeys = Array.isArray(body.mediaKeys) ? body.mediaKeys : [];
    const mediaTypes = Array.isArray(body.mediaTypes) ? body.mediaTypes : [];

    if (!contributionId)
      return NextResponse.json({ error: "Missing contributionId." }, { status: 400 });

    const { prisma } = await import("@/lib/prisma");
    await prisma.capsuleContribution.update({
      where: { id: contributionId },
      data: { mediaUrls: mediaKeys, mediaTypes },
    });

    const viewUrls = await Promise.all(mediaKeys.map((k) => signGetUrl(k)));
    return NextResponse.json({ success: true, viewUrls });
  }

  if (body.action === "view") {
    const key = typeof body.key === "string" ? body.key : "";
    if (!key)
      return NextResponse.json({ error: "Missing key." }, { status: 400 });
    const viewUrl = await signGetUrl(key);
    return NextResponse.json({ viewUrl });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
