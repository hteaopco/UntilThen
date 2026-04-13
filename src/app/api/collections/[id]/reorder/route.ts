import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  order?: string[];
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

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.order) || !body.order.every((x) => typeof x === "string")) {
    return NextResponse.json(
      { error: "order must be an array of entry ids." },
      { status: 400 },
    );
  }
  const order = body.order;

  try {
    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });
    if (!user)
      return NextResponse.json({ error: "User not found." }, { status: 404 });

    const collection = await prisma.collection.findUnique({
      where: { id },
      include: { entries: { select: { id: true } } },
    });
    if (!collection)
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (collection.authorId !== user.id)
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });

    const validIds = new Set(collection.entries.map((e) => e.id));
    if (!order.every((id) => validIds.has(id))) {
      return NextResponse.json(
        { error: "order contains entry ids that don't belong to this collection." },
        { status: 400 },
      );
    }

    await prisma.$transaction(
      order.map((entryId, index) =>
        prisma.entry.update({
          where: { id: entryId },
          data: { orderIndex: index },
        }),
      ),
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[collections reorder] error:", err);
    return NextResponse.json(
      { error: "Couldn't save the new order." },
      { status: 500 },
    );
  }
}
