import { auth } from "@clerk/nextjs/server";
import { OccasionType } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";

import {
  CAPSULE_MAX_HORIZON_DAYS,
  WEDDING_MAX_HORIZON_DAYS,
  findOwnedCapsule,
  maxHorizonMsForOccasion,
} from "@/lib/capsules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_OCCASIONS: OccasionType[] = [
  "BIRTHDAY",
  "ANNIVERSARY",
  "RETIREMENT",
  "GRADUATION",
  "WEDDING",
  "OTHER",
];

interface PatchBody {
  title?: string;
  recipientName?: string;
  recipientPronoun?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  occasionType?: string;
  revealDate?: string;
  contributorDeadline?: string | null;
  requiresApproval?: boolean;
  /** Manual seal — locks all contribution-mutating routes when
   *  true. Reversible. ACTIVE capsule status is preserved so the
   *  reveal cron still picks the capsule up on revealDate. */
  contributionsClosed?: boolean;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  const { id } = await ctx.params;
  const owned = await findOwnedCapsule(userId ?? null, id);
  if (!owned.ok)
    return NextResponse.json({ error: "Not found." }, { status: owned.status });

  const { prisma } = await import("@/lib/prisma");
  const full = await prisma.memoryCapsule.findUnique({
    where: { id },
    include: {
      contributions: { orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }] },
      invites: { orderBy: { createdAt: "asc" } },
    },
  });
  return NextResponse.json({ capsule: full });
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  const { id } = await ctx.params;
  const owned = await findOwnedCapsule(userId ?? null, id);
  if (!owned.ok)
    return NextResponse.json({ error: "Not found." }, { status: owned.status });

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") {
    const t = body.title.trim();
    if (!t)
      return NextResponse.json(
        { error: "Title can't be empty." },
        { status: 400 },
      );
    data.title = t;
  }
  if (typeof body.recipientName === "string") {
    const v = body.recipientName.trim();
    if (!v)
      return NextResponse.json(
        { error: "Recipient name can't be empty." },
        { status: 400 },
      );
    data.recipientName = v;
  }
  if ("recipientPronoun" in body) {
    const v =
      typeof body.recipientPronoun === "string"
        ? body.recipientPronoun.trim().toLowerCase()
        : "";
    data.recipientPronoun = ["her", "him", "them"].includes(v) ? v : null;
  }
  if ("recipientEmail" in body) {
    const v =
      typeof body.recipientEmail === "string"
        ? body.recipientEmail.trim().toLowerCase()
        : "";
    data.recipientEmail = v || null;
  }
  if ("recipientPhone" in body) {
    const v =
      typeof body.recipientPhone === "string"
        ? body.recipientPhone.trim()
        : "";
    data.recipientPhone = v || null;
  }
  if (
    typeof body.occasionType === "string" &&
    VALID_OCCASIONS.includes(body.occasionType as OccasionType)
  ) {
    data.occasionType = body.occasionType as OccasionType;
  }
  if (typeof body.revealDate === "string") {
    const parsed = new Date(body.revealDate);
    if (Number.isNaN(parsed.getTime()))
      return NextResponse.json(
        { error: "Invalid reveal date." },
        { status: 400 },
      );
    // Measure from the capsule's original createdAt — not from
    // `now` — so an organiser can't slide the reveal out by
    // editing later. Wedding capsules use the 600-day horizon.
    const nextOccasion =
      (data.occasionType as OccasionType | undefined) ??
      owned.capsule.occasionType;
    const ceiling =
      owned.capsule.createdAt.getTime() +
      maxHorizonMsForOccasion(nextOccasion);
    if (parsed.getTime() > ceiling) {
      const days =
        nextOccasion === "WEDDING"
          ? WEDDING_MAX_HORIZON_DAYS
          : CAPSULE_MAX_HORIZON_DAYS;
      const label =
        nextOccasion === "WEDDING" ? "Wedding Capsules" : "Gift Capsules";
      return NextResponse.json(
        {
          error: `${label} reveal within ${days} days of creation.`,
        },
        { status: 400 },
      );
    }
    data.revealDate = parsed;
  }
  if ("contributorDeadline" in body) {
    if (body.contributorDeadline === null || body.contributorDeadline === "") {
      data.contributorDeadline = null;
    } else if (typeof body.contributorDeadline === "string") {
      const parsed = new Date(body.contributorDeadline);
      if (Number.isNaN(parsed.getTime()))
        return NextResponse.json(
          { error: "Invalid deadline." },
          { status: 400 },
        );
      data.contributorDeadline = parsed;
    }
  }
  if (typeof body.requiresApproval === "boolean") {
    data.requiresApproval = body.requiresApproval;
  }
  if (typeof body.contributionsClosed === "boolean") {
    // Only meaningful on ACTIVE capsules. DRAFT capsules can't
    // be sealed (no one can contribute yet); SEALED/REVEALED
    // capsules are already past this gate.
    if (owned.capsule.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Only active capsules can be sealed." },
        { status: 400 },
      );
    }
    data.contributionsClosed = body.contributionsClosed;
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    await prisma.memoryCapsule.update({ where: { id }, data });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[capsules PATCH] error:", err);
    return NextResponse.json(
      { error: "Couldn't save the capsule." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  const { id } = await ctx.params;
  const owned = await findOwnedCapsule(userId ?? null, id);
  if (!owned.ok)
    return NextResponse.json({ error: "Not found." }, { status: owned.status });

  try {
    const { prisma } = await import("@/lib/prisma");
    // Cascade on MemoryCapsule → contributions + invites handles
    // the children rows (see prisma schema).
    await prisma.memoryCapsule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[capsules DELETE] error:", err);
    return NextResponse.json(
      { error: "Couldn't delete the capsule." },
      { status: 500 },
    );
  }
}
