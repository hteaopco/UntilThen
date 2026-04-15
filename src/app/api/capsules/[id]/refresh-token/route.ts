import { NextResponse, type NextRequest } from "next/server";

import { RECIPIENT_TOKEN_TTL_MS } from "@/lib/capsules";
import { sendCapsuleNewLink } from "@/lib/capsule-emails";
import { captureServerEvent } from "@/lib/posthog-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  email?: string;
}

/**
 * Public: recipient's magic link expired. Send a fresh one —
 * only to the email on file. No auth, no personal info leaked
 * to strangers: if the provided email doesn't match, we still
 * respond with success so the route can't be used to probe
 * which capsules exist.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await ctx.params;
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }
  const providedEmail =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  const { prisma } = await import("@/lib/prisma");
  const capsule = await prisma.memoryCapsule.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      recipientName: true,
      recipientEmail: true,
      revealDate: true,
      accessToken: true,
    },
  });

  // Same response regardless so the endpoint doesn't leak
  // existence. If the email matches, actually refresh + send.
  if (capsule && capsule.recipientEmail === providedEmail) {
    const newExpiry = new Date(
      Math.max(
        Date.now() + RECIPIENT_TOKEN_TTL_MS,
        capsule.revealDate.getTime() + RECIPIENT_TOKEN_TTL_MS,
      ),
    );
    await prisma.memoryCapsule.update({
      where: { id },
      data: { tokenExpiresAt: newExpiry },
    });
    await sendCapsuleNewLink({
      to: capsule.recipientEmail,
      recipientName: capsule.recipientName,
      title: capsule.title,
      capsuleId: capsule.id,
      accessToken: capsule.accessToken,
    });
    await captureServerEvent(`recipient:${id}`, "capsule_token_refreshed", {
      capsuleId: id,
    });
  }

  return NextResponse.json({ success: true });
}
