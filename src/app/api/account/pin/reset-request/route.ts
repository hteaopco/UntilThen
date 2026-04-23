import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { sendPinReset } from "@/lib/emails";
import { generateResetToken } from "@/lib/pin";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/account/pin/reset-request
 *
 * Generates a one-time reset token, stashes its SHA-256 hash on
 * the user row with a 1-hour expiry, and emails the raw token in
 * a link back to /account/pin/reset. Called from the lock
 * screen's "Forgot PIN?" flow — so the user is signed in but
 * can't remember their PIN.
 *
 * Rate-limited via the email bucket so someone spamming the
 * endpoint can't DoS the user's inbox.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database not configured." },
      { status: 500 },
    );
  }

  const { success } = await checkRateLimit("email", clientIp(req.headers));
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a few minutes." },
      { status: 429 },
    );
  }

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true, firstName: true, pinHash: true },
  });
  if (!user)
    return NextResponse.json({ error: "User not found." }, { status: 404 });

  // If the user doesn't have a PIN set, quietly return success
  // without emailing. No need to signal "nothing to reset" — the
  // lock screen won't have rendered for them anyway.
  if (!user.pinHash) {
    return NextResponse.json({ success: true });
  }

  const { token, hash, expires } = generateResetToken();
  await prisma.user.update({
    where: { id: user.id },
    data: { pinResetTokenHash: hash, pinResetExpires: expires },
  });

  // Look up Clerk email. Users authenticate through Clerk, not
  // our DB, so the email lives there.
  let email: string | null = null;
  try {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    email =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress ??
      null;
  } catch (err) {
    console.error("[pin/reset-request] clerk lookup:", err);
  }
  if (!email) {
    return NextResponse.json(
      { error: "Couldn't find your email address." },
      { status: 500 },
    );
  }

  const origin =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://untilthenapp.io";
  const resetUrl = `${origin}/account/pin/reset?token=${encodeURIComponent(token)}`;

  await sendPinReset({
    to: email,
    firstName: user.firstName,
    resetUrl,
  });

  return NextResponse.json({ success: true });
}
