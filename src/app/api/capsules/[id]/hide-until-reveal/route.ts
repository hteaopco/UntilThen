import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { findOwnedCapsule } from "@/lib/capsules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Wedding bride/groom hand-off: organiser sets hideUntilReveal
 * = true so their dashboard redacts contribution bodies until
 * revealDate. Body is { hide: boolean } so we can flip it back
 * if they change their mind.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const owned = await findOwnedCapsule(userId, id);
  if (!owned.ok)
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  let body: { hide?: boolean };
  try {
    body = (await req.json()) as { hide?: boolean };
  } catch {
    body = {};
  }
  const hide = body.hide !== false;

  const { prisma } = await import("@/lib/prisma");
  await prisma.memoryCapsule.update({
    where: { id },
    data: { hideUntilReveal: hide },
  });

  return NextResponse.json({ ok: true, hideUntilReveal: hide });
}
