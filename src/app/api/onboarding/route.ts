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
 * 2. Memory Capsule — name-only body. We create just the User
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
          await prisma.$transaction(async (tx) => {
            const child = await tx.child.create({
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
            await tx.vault.create({
              data: {
                childId: child.id,
                revealDate: defaultRevealDate,
              },
            });
            await tx.user.update({
              where: { id: existing.id },
              data: {
                userType:
                  existing.userType === "ORGANISER" ? "BOTH" : "PARENT",
              },
            });
          });
        }
      }
      return NextResponse.json({ success: true, alreadyOnboarded: true });
    }

    // Fresh user — create the User row and (for vault path) the
    // child + vault in one transaction.
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          clerkId: userId,
          firstName,
          // lastName is now optional — fall back to empty string
          // so the column constraint still holds.
          lastName: lastName || "",
          role: "PARENT",
          userType: flow === "memory_capsule" ? "ORGANISER" : "PARENT",
          notificationPreferences: { create: {} },
        },
      });

      if (flow === "child_vault" && childDob) {
        const childFirstName = (body.childFirstName as string).trim();
        const childLastName = (body.childLastName as string).trim();
        const child = await tx.child.create({
          data: {
            firstName: childFirstName,
            lastName: childLastName,
            dateOfBirth: childDob,
            parentId: user.id,
          },
        });
        const defaultRevealDate = new Date(childDob);
        defaultRevealDate.setFullYear(defaultRevealDate.getFullYear() + 18);
        await tx.vault.create({
          data: {
            childId: child.id,
            revealDate: defaultRevealDate,
          },
        });
      }
    });

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
    console.error("[onboarding] error:", err);
    return NextResponse.json(
      { error: "Something went wrong saving your account." },
      { status: 500 },
    );
  }
}
