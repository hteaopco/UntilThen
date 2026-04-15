import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stamp `recipientCompletedAt` once the recipient has walked
 * through the full sequential reveal. Token-gated like the rest of
 * the public capsule surfaces; idempotent so the client can fire
 * it without coordination.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  let body: { token?: string };
  try {
    body = (await req.json()) as { token?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token : "";
  if (!token) {
    return NextResponse.json({ error: "Missing token." }, { status: 401 });
  }

  const { prisma } = await import("@/lib/prisma");
  const capsule = await prisma.memoryCapsule.findUnique({
    where: { id },
    select: { accessToken: true, recipientCompletedAt: true },
  });
  if (!capsule) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (capsule.accessToken !== token) {
    return NextResponse.json({ error: "Invalid link." }, { status: 401 });
  }
  if (!capsule.recipientCompletedAt) {
    await prisma.memoryCapsule.update({
      where: { id },
      data: { recipientCompletedAt: new Date() },
    });
  }
  return NextResponse.json({ success: true });
}
