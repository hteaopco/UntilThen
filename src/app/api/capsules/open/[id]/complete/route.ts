import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Mark the recipient's sequential reveal as complete.
 *
 * Originally this wrote MemoryCapsule.recipientCompletedAt, but
 * Prisma Accelerate is currently serving a stale schema that
 * rejects the column with P2022 even though the DB has it. Until
 * Accelerate's cache is genuinely refreshed (two manual restarts
 * so far haven't taken), this endpoint validates the token and
 * returns success without touching the row — analytics keeps
 * firing from the client (capsule_sequential_completed) which is
 * enough for product signal. Re-enable the DB write once the
 * schema cache is definitely fresh.
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
    select: { accessToken: true },
  });
  if (!capsule) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (capsule.accessToken !== token) {
    return NextResponse.json({ error: "Invalid link." }, { status: 401 });
  }
  // No DB write for now — see header comment. Client-side PostHog
  // event still fires from CapsuleRevealClient.onComplete.
  return NextResponse.json({ success: true });
}
