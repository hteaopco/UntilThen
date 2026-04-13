import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  vaultId?: string;
  title?: string | null;
  body?: string;
  isSealed?: boolean;
}

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json({ error: "Database unreachable." }, { status: 500 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const vaultId =
    typeof body.vaultId === "string" ? body.vaultId : "";
  if (!vaultId)
    return NextResponse.json({ error: "Missing vaultId" }, { status: 400 });

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const bodyText = typeof body.body === "string" ? body.body : "";
  const isSealed = body.isSealed === true;

  try {
    const { prisma } = await import("@/lib/prisma");
    const contributor = await prisma.contributor.findFirst({
      where: { vaultId, clerkUserId: userId, status: "ACTIVE" },
    });
    if (!contributor)
      return NextResponse.json({ error: "Not a contributor." }, { status: 403 });

    const user = await prisma.user.upsert({
      where: { clerkId: userId },
      update: {},
      create: {
        clerkId: userId,
        firstName: contributor.name ?? "Contributor",
        lastName: "",
        role: "CONTRIBUTOR",
      },
    });

    const approvalStatus: "PENDING_REVIEW" | "AUTO_APPROVED" =
      isSealed && contributor.requiresApproval
        ? "PENDING_REVIEW"
        : "AUTO_APPROVED";

    const entry = await prisma.entry.create({
      data: {
        vaultId,
        authorId: user.id,
        contributorId: contributor.id,
        type: "TEXT",
        title: title || null,
        body: bodyText || null,
        isDraft: !isSealed,
        isSealed,
        approvalStatus,
      },
    });

    // Notify the parent when a contributor sealed something that
    // needs review. Best-effort.
    if (isSealed && approvalStatus === "PENDING_REVIEW") {
      try {
        const child = await prisma.child.findUnique({
          where: { id: (await prisma.vault.findUnique({ where: { id: vaultId } }))?.childId ?? "" },
        });
        if (child) {
          const parent = await prisma.user.findUnique({
            where: { id: child.parentId },
          });
          if (parent) {
            const { sendEntryNeedsReview } = await import("@/lib/emails");
            await sendEntryNeedsReview({
              parentEmail: "",
              contributorName: contributor.name ?? contributor.email,
              childFirstName: child.firstName,
              entryTitle: title || "Untitled",
            });
          }
        }
      } catch (err) {
        console.error("[contribute/entries] notify error:", err);
      }
    }

    return NextResponse.json({ success: true, id: entry.id });
  } catch (err) {
    console.error("[contribute/entries POST] error:", err);
    return NextResponse.json(
      { error: "Couldn't save entry." },
      { status: 500 },
    );
  }
}
