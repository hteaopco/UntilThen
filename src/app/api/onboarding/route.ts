import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  captureServerEvent,
  identifyServerUser,
} from "@/lib/posthog-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Onboarding now has two entry paths:
 *
 * 1. Child vault — the full POST body includes
 *    `childFirstName / childLastName / childDateOfBirth`.
 *    We create User → Child → Vault in one transaction (the
 *    historical behaviour).
 *
 * 2. Gift Capsule — name-only body. We create just the User
 *    record so the organiser can proceed to `/capsules/new`
 *    without a child on file. `userType` is stamped based on
 *    which path arrived.
 *
 * Either path is idempotent: if the user already exists we
 * return { alreadyOnboarded: true } so client-side rehydrates
 * don't duplicate records.
 */
interface Body {
  firstName?: string;
  lastName?: string;
  childFirstName?: string;
  childLastName?: string;
  childDateOfBirth?: string;
  /** Which path the user came through. */
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

  // Detect which flow we're running. Presence of any child field
  // = vault path. Explicit path="memory_capsule" = name-only.
  const hasChildPayload =
    typeof body.childFirstName === "string" &&
    body.childFirstName.trim().length > 0;
  const flow: "child_vault" | "memory_capsule" =
    body.path === "memory_capsule"
      ? "memory_capsule"
      : hasChildPayload
        ? "child_vault"
        : "memory_capsule";

  let childDob: Date | null = null;
  if (flow === "child_vault") {
    const childFirstName =
      typeof body.childFirstName === "string" ? body.childFirstName.trim() : "";
    const childLastName =
      typeof body.childLastName === "string" ? body.childLastName.trim() : "";
    const childDobRaw =
      typeof body.childDateOfBirth === "string"
        ? body.childDateOfBirth.trim()
        : "";

    if (!childFirstName || !childLastName) {
      return NextResponse.json(
        { error: "Please enter your child's first and last name." },
        { status: 400 },
      );
    }
    if (!childDobRaw) {
      return NextResponse.json(
        { error: "Please enter your child's birthdate." },
        { status: 400 },
      );
    }
    childDob = new Date(childDobRaw);
    if (Number.isNaN(childDob.getTime())) {
      return NextResponse.json(
        { error: "Child's birthdate is invalid." },
        { status: 400 },
      );
    }
    if (childDob.getTime() > Date.now()) {
      return NextResponse.json(
        { error: "Child's birthdate can't be in the future." },
        { status: 400 },
      );
    }
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    const existing = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { children: { include: { vault: true } } },
    });

    if (existing) {
      // User already exists. If they were an ORGANISER originally
      // and now are completing the vault path (or vice-versa),
      // bump userType to BOTH and backfill the vault. Otherwise
      // no-op.
      if (flow === "child_vault" && childDob) {
        const hasVault = existing.children.some((c) => c.vault !== null);
        if (!hasVault) {
          const childFirstName = (body.childFirstName as string).trim();
          const childLastName = (body.childLastName as string).trim();
          // Sequential writes without a $transaction. Prisma
          // Accelerate caps interactive transactions at 15s (P6005);
          // for onboarding's 2–3 inserts the atomicity isn't worth
          // the operational risk. If a later write fails we log,
          // leave any partial rows in place, and surface a 500 so
          // the client can retry idempotently (the findUnique at
          // the top of this handler is the guard).
          const child = await prisma.child.create({
            data: {
              firstName: childFirstName,
              lastName: childLastName,
              dateOfBirth: childDob,
              parentId: existing.id,
            },
          });
          const defaultRevealDate = new Date(childDob!);
          defaultRevealDate.setFullYear(
            defaultRevealDate.getFullYear() + 18,
          );
          await prisma.vault.create({
            data: {
              childId: child.id,
              revealDate: defaultRevealDate,
            },
          });
          await prisma.user.update({
            where: { id: existing.id },
            data: {
              userType:
                existing.userType === "ORGANISER" ? "BOTH" : "PARENT",
            },
          });
        }
      }
      return NextResponse.json({ success: true, alreadyOnboarded: true });
    }

    // Fresh user. Both paths now run as sequential individual
    // writes — Prisma Accelerate doesn't support long-running
    // interactive transactions (hard 15s ceiling, error P6005),
    // so onboarding has to live with the usual distributed-write
    // tradeoff: partial failure can leave an orphan row. The
    // handler is idempotent on retry because the findUnique on
    // clerkId above catches the user row we already created.
    let createdUserId: string;
    if (flow === "memory_capsule") {
      const user = await prisma.user.create({
        data: {
          clerkId: userId,
          firstName,
          lastName: lastName || "",
          role: "PARENT",
          userType: "ORGANISER",
        },
      });
      createdUserId = user.id;
    } else {
      const childFirstName = (body.childFirstName as string).trim();
      const childLastName = (body.childLastName as string).trim();
      const user = await prisma.user.create({
        data: {
          clerkId: userId,
          firstName,
          lastName: lastName || "",
          role: "PARENT",
          userType: "PARENT",
        },
      });
      const child = await prisma.child.create({
        data: {
          firstName: childFirstName,
          lastName: childLastName,
          dateOfBirth: childDob!,
          parentId: user.id,
        },
      });
      const defaultRevealDate = new Date(childDob!);
      defaultRevealDate.setFullYear(defaultRevealDate.getFullYear() + 18);
      await prisma.vault.create({
        data: {
          childId: child.id,
          revealDate: defaultRevealDate,
        },
      });
      createdUserId = user.id;
    }

    // Notification preferences live in their own row with a unique
    // userId. Create it after the user row exists so a failure here
    // doesn't roll back onboarding — the user can always open
    // settings and the row will be created on first save. Best-
    // effort, same as PostHog below.
    try {
      await prisma.notificationPreferences.create({
        data: { userId: createdUserId },
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
        userType: flow === "memory_capsule" ? "ORGANISER" : "PARENT",
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
    // Render the Prisma error fields explicitly so they survive
    // whatever console.error → log aggregator formatting Railway
    // applies. Without this the `err` object sometimes prints as
    // `[object Object]` and the cause is invisible.
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
