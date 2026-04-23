import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";
import { getSquareClient, squareIsConfigured } from "@/lib/square";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/reset-user-subscription
 *
 * Pre-launch testing helper. Looks up a user by email, cancels
 * every linked Square subscription (base, pending-switch, every
 * addon sub) and deletes the Subscription row. User can then
 * subscribe fresh on a different cadence without the normal
 * \"You already have an active subscription\" block.
 *
 * Does NOT wipe squareCustomerId or squareCardId — the saved
 * card on file stays so the next subscribe doesn't need a fresh
 * card entry. If that's needed, an admin can clear those
 * separately (future feature, not wired yet).
 *
 * Body: { email: string } — the target user's Clerk email.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = req.cookies.get("admin_auth")?.value;
  if (!process.env.ADMIN_PASSWORD || auth !== process.env.ADMIN_PASSWORD)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "DATABASE_URL is not set." },
      { status: 500 },
    );

  let body: { email?: unknown };
  try {
    body = (await req.json()) as { email?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const email =
    typeof body.email === "string" && body.email.trim()
      ? body.email.trim().toLowerCase()
      : null;
  if (!email)
    return NextResponse.json(
      { error: "Missing email." },
      { status: 400 },
    );

  // Resolve Clerk user → our User row.
  let clerkUserId: string | null = null;
  try {
    const clerk = await clerkClient();
    const matches = await clerk.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });
    clerkUserId = matches.data[0]?.id ?? null;
  } catch (err) {
    console.error("[admin/reset-user-subscription] clerk lookup failed:", err);
  }
  if (!clerkUserId)
    return NextResponse.json(
      { error: `No Clerk user found for ${email}.` },
      { status: 404 },
    );

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    select: {
      id: true,
      subscription: {
        select: {
          id: true,
          squareSubId: true,
          pendingSquareSubId: true,
          addonSquareSubIds: true,
        },
      },
    },
  });
  if (!user)
    return NextResponse.json(
      { error: `No local user for ${email}.` },
      { status: 404 },
    );
  if (!user.subscription) {
    return NextResponse.json({
      success: true,
      canceled: 0,
      detail: "No subscription to reset.",
    });
  }

  const sub = user.subscription;
  const toCancel: string[] = [sub.squareSubId];
  if (sub.pendingSquareSubId) toCancel.push(sub.pendingSquareSubId);
  toCancel.push(...sub.addonSquareSubIds);

  let canceled = 0;
  if (squareIsConfigured()) {
    const square = getSquareClient();
    for (const subId of toCancel) {
      try {
        await square.subscriptions.cancel({ subscriptionId: subId });
        canceled += 1;
      } catch (err) {
        // Already-cancelled or unknown Square sub — fine. Log
        // so we notice if something's really broken.
        console.warn(
          `[admin/reset-user-subscription] cancel failed for ${subId}:`,
          err,
        );
      }
    }
  }

  await prisma.subscription.delete({ where: { id: sub.id } });

  // Post-reset state: no subscription means no paid slots, so
  // every unlocked vault is now over quota. Lock them all so
  // the user sees a clean "subscribe to unlock" state until
  // they resubscribe.
  const { reconcileVaultLocks } = await import("@/lib/vault-locks");
  await reconcileVaultLocks(user.id);

  await logAdminAction(
    req,
    "subscription.reset",
    { type: "User", id: user.id },
    { email, canceled, totalSubs: toCancel.length },
  );

  return NextResponse.json({
    success: true,
    email,
    canceled,
    totalSubs: toCancel.length,
  });
}
