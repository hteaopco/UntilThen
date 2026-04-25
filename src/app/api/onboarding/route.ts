import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  captureServerEvent,
  identifyServerUser,
} from "@/lib/posthog-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Onboarding — creates the User row only.
 *
 * Previously this endpoint also created the first Child + Vault
 * for users who picked the child-vault path. That coupling bit
 * the paywall model: a new signup could pick "Write to my child"
 * and get a free time capsule before ever seeing the dashboard.
 *
 * Under the post-April-22 paywall model every signup lands in
 * their free owner vault. Time capsules (child vaults) are
 * created exclusively through AddChildModal → POST
 * /api/account/children, which is where the $4.99/mo paywall
 * lives. Gift Capsules stay free-to-create, paywalled at $9.99
 * activation.
 *
 * Body shape:
 *   {
 *     firstName: string    (required)
 *     lastName?: string
 *     path?: "child_vault" | "memory_capsule"   // optional. When
 *                                               // omitted the user
 *                                               // is stamped as
 *                                               // userType: BOTH
 *                                               // so the dashboard
 *                                               // shows both
 *                                               // products until
 *                                               // they pick one.
 *   }
 *
 * Idempotent: if the User already exists, returns
 * { alreadyOnboarded: true } without touching the row.
 */
interface Body {
  firstName?: string;
  lastName?: string;
  /** Which path the user came through — drives the post-signup
   *  redirect + userType stamping. Optional: omitted means the
   *  user landed on the simplified onboarding form without
   *  declaring a product preference, so we default to BOTH. */
  path?: "child_vault" | "memory_capsule";
}

export async function POST(req: Request) {
  const { userId } = auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const firstName =
    typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName =
    typeof body.lastName === "string" ? body.lastName.trim() : "";

  if (!firstName) {
    return NextResponse.json(
      { error: "Please enter your first name." },
      { status: 400 },
    );
  }

  // Optional path — omit on the simplified onboarding form, set
  // when the user came through the Gift Capsule CTA so we still
  // bump them to ORGANISER on the dashboard.
  const flow: "child_vault" | "memory_capsule" | null =
    body.path === "child_vault"
      ? "child_vault"
      : body.path === "memory_capsule"
        ? "memory_capsule"
        : null;

  try {
    const { prisma } = await import("@/lib/prisma");

    const existing = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true, userType: true },
    });

    if (existing) {
      // Already onboarded. Bump userType to BOTH when the user
      // is now completing the other path so the dashboard
      // personalisation stays accurate. When flow is null
      // (simplified onboarding) leave userType untouched.
      if (flow !== null) {
        const targetType =
          flow === "child_vault"
            ? existing.userType === "ORGANISER"
              ? "BOTH"
              : "PARENT"
            : existing.userType === "PARENT"
              ? "BOTH"
              : "ORGANISER";
        if (targetType !== existing.userType) {
          await prisma.user.update({
            where: { id: existing.id },
            data: { userType: targetType },
          });
        }
      }
      return NextResponse.json({ success: true, alreadyOnboarded: true });
    }

    // New user — stamp userType from the path if given, else BOTH
    // so the dashboard surfaces both products until they pick one.
    const userType =
      flow === "child_vault"
        ? "PARENT"
        : flow === "memory_capsule"
          ? "ORGANISER"
          : "BOTH";
    // Pull the Clerk user up front so we can write email onto the
    // User row at create time. Falls back to null if Clerk hiccups
    // — backfill via ensureUserEmail() handles it later.
    let clerkEmail: string | null = null;
    try {
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId);
      clerkEmail =
        clerkUser.primaryEmailAddress?.emailAddress?.toLowerCase() ??
        clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase() ??
        null;
    } catch (err) {
      console.warn("[onboarding] clerk email lookup failed:", err);
    }

    const user = await prisma.user.create({
      data: {
        clerkId: userId,
        firstName,
        lastName: lastName || "",
        email: clerkEmail,
        role: "PARENT",
        userType,
      },
    });

    // Notification preferences live in their own row with a unique
    // userId. Best-effort — the user can always open settings and
    // the row will be created on first save.
    try {
      await prisma.notificationPreferences.create({
        data: { userId: user.id },
      });
    } catch (err) {
      console.error("[onboarding] notification-prefs create failed:", err);
    }

    // Identify + capture in PostHog. Best-effort — we've already
    // committed the row so analytics can't fail the request.
    try {
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(userId);
      const email =
        clerkUser.primaryEmailAddress?.emailAddress ??
        clerkUser.emailAddresses[0]?.emailAddress ??
        null;
      await identifyServerUser(userId, {
        email,
        firstName,
        userType,
        createdAt: new Date().toISOString(),
      });
      await captureServerEvent(userId, "user_signed_up", {
        firstName,
        path: flow,
      });
      await captureServerEvent(userId, "onboarding_path_selected", {
        path: flow,
      });
    } catch (err) {
      console.error("[onboarding] posthog:", err);
    }

    return NextResponse.json({ success: true, flow });
  } catch (err) {
    const e = err as {
      code?: string;
      message?: string;
      meta?: unknown;
      clientVersion?: string;
      stack?: string;
    };
    console.error(
      "[onboarding] error:",
      JSON.stringify(
        {
          flow,
          code: e.code,
          message: e.message,
          meta: e.meta,
          clientVersion: e.clientVersion,
        },
        null,
        2,
      ),
    );
    if (e.stack) console.error("[onboarding] stack:", e.stack);
    return NextResponse.json(
      { error: "Something went wrong saving your account." },
      { status: 500 },
    );
  }
}
