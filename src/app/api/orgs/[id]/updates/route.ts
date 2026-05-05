import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { getOrgContextByClerkId } from "@/lib/orgs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PostBody {
  title?: string;
  body?: string;
}

const TITLE_MAX = 120;
const BODY_MAX = 1000;

/**
 * Org updates surface — OWNER/ADMIN posts; every member of the
 * organisation reads. Surfaced on /dashboard/updates as a
 * subsection above the per-user pending-contribution inbox.
 *
 * GET → list every update on this org, newest first. Members
 * (any role) can read; non-members 403.
 *
 * POST → create a new update. Only OWNER + ADMIN may post; the
 * authoring member's User.id is captured (nullable) and their
 * Clerk firstName + lastName are denormalised to authorName so
 * the byline survives an org departure.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id: organizationId } = await ctx.params;
  if (!organizationId)
    return NextResponse.json({ error: "Missing org id." }, { status: 400 });

  const orgCtx = await getOrgContextByClerkId(userId);
  if (!orgCtx || orgCtx.organizationId !== organizationId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { prisma } = await import("@/lib/prisma");
  const updates = await prisma.organizationUpdate.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      title: true,
      body: true,
      authorName: true,
      createdAt: true,
    },
  });
  return NextResponse.json({
    updates: updates.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
  });
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const { id: organizationId } = await ctx.params;
  if (!organizationId)
    return NextResponse.json({ error: "Missing org id." }, { status: 400 });

  const orgCtx = await getOrgContextByClerkId(userId);
  if (!orgCtx || orgCtx.organizationId !== organizationId) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (orgCtx.role !== "OWNER" && orgCtx.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Only OWNER or ADMIN can post updates." },
      { status: 403 },
    );
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const title =
    typeof body.title === "string" ? body.title.trim().slice(0, TITLE_MAX) : "";
  const text =
    typeof body.body === "string" ? body.body.trim().slice(0, BODY_MAX) : "";
  if (!title) {
    return NextResponse.json(
      { error: "Title is required." },
      { status: 400 },
    );
  }
  if (!text) {
    return NextResponse.json(
      { error: "Body is required." },
      { status: 400 },
    );
  }

  const { prisma } = await import("@/lib/prisma");
  const author = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, firstName: true, lastName: true },
  });

  // Pull a friendlier display name from Clerk if our local row
  // doesn't have one yet — onboarding usually backfills the
  // names but a brand-new admin may not be synced.
  let authorName =
    [author?.firstName, author?.lastName].filter(Boolean).join(" ").trim();
  if (!authorName) {
    try {
      const clerk = await clerkClient();
      const u = await clerk.users.getUser(userId);
      authorName =
        [u.firstName, u.lastName].filter(Boolean).join(" ").trim() ||
        u.primaryEmailAddress?.emailAddress ||
        "An organisation admin";
    } catch {
      authorName = "An organisation admin";
    }
  }

  const created = await prisma.organizationUpdate.create({
    data: {
      organizationId,
      authorUserId: author?.id ?? null,
      authorName,
      title,
      body: text,
    },
    select: {
      id: true,
      title: true,
      body: true,
      authorName: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    update: { ...created, createdAt: created.createdAt.toISOString() },
  });
}
