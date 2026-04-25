import { clerkClient } from "@clerk/nextjs/server";

import { prisma } from "@/lib/prisma";

/**
 * Opportunistic email backfill. New users get email written at
 * /api/onboarding create time, but existing rows from before the
 * 20260425_user_email_phone migration have email=null. Call this
 * helper from any auth-gated server path that has the user's
 * clerkId — it's a no-op if email is already set, otherwise it
 * looks up the Clerk user once and writes their primary email
 * to the User row.
 *
 * Cheap when email is already populated (single SELECT). When the
 * Clerk lookup is needed, it's one HTTP call + one UPDATE per
 * user, ever — after that the column stays filled.
 *
 * Safe to fire-and-forget; no return value.
 */
export async function ensureUserEmail(clerkId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, email: true },
    });
    if (!user || user.email) return;

    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(clerkId);
    const email =
      clerkUser.primaryEmailAddress?.emailAddress?.toLowerCase() ??
      clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase() ??
      null;
    if (!email) return;

    await prisma.user.update({
      where: { id: user.id },
      data: { email },
    });
  } catch (err) {
    // Best-effort. Worst case: avatar match misses for this user
    // until the next time the helper runs successfully.
    console.warn("[user-sync] email backfill failed:", err);
  }
}

/**
 * Mirror the user's verified primary phone from Clerk to the
 * User.phone column. Phone is collected + verified inside Clerk's
 * user-profile modal (opened from /account); this helper just
 * keeps our DB copy in sync so server paths can read phone
 * without hitting Clerk every request.
 *
 * Behaviour:
 *   - Reads User.phone first; if it already matches the verified
 *     Clerk primary, no Clerk lookup runs.
 *   - On mismatch, pulls Clerk and updates User.phone (or clears
 *     it when the user removed their number).
 *   - Only mirrors verified numbers — an unverified number stays
 *     in Clerk but doesn't write to the DB.
 *
 * Safe to fire-and-forget; no return value.
 */
export async function ensureUserPhone(clerkId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, phone: true },
    });
    if (!user) return;

    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(clerkId);
    const primary = clerkUser.primaryPhoneNumber;
    const verifiedPhone =
      primary && primary.verification?.status === "verified"
        ? primary.phoneNumber ?? null
        : null;

    if (user.phone === verifiedPhone) return;

    await prisma.user.update({
      where: { id: user.id },
      data: { phone: verifiedPhone },
    });
  } catch (err) {
    console.warn("[user-sync] phone sync failed:", err);
  }
}
