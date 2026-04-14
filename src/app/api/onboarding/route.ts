import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import {
  captureServerEvent,
  identifyServerUser,
} from "@/lib/posthog-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  firstName?: string;
  lastName?: string;
  childFirstName?: string;
  childLastName?: string;
  childDateOfBirth?: string;
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
  const childFirstName =
    typeof body.childFirstName === "string" ? body.childFirstName.trim() : "";
  const childLastName =
    typeof body.childLastName === "string" ? body.childLastName.trim() : "";
  const childDobRaw =
    typeof body.childDateOfBirth === "string"
      ? body.childDateOfBirth.trim()
      : "";

  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: "Please enter your first and last name." },
      { status: 400 },
    );
  }
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

  const childDob = new Date(childDobRaw);
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

  try {
    const { prisma } = await import("@/lib/prisma");

    const existing = await prisma.user.findUnique({
      where: { clerkId: userId },
    });
    if (existing) {
      return NextResponse.json({ success: true, alreadyOnboarded: true });
    }

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          clerkId: userId,
          firstName,
          lastName,
          role: "PARENT",
          // Seed default notification preferences so the account
          // settings page always has a row to show.
          notificationPreferences: { create: {} },
        },
      });
      const child = await tx.child.create({
        data: {
          firstName: childFirstName,
          lastName: childLastName,
          dateOfBirth: childDob,
          parentId: user.id,
        },
      });
      // Default the vault's reveal date to the child's 18th birthday.
      // Parents can change this later from the dashboard.
      const defaultRevealDate = new Date(childDob);
      defaultRevealDate.setFullYear(defaultRevealDate.getFullYear() + 18);
      await tx.vault.create({
        data: {
          childId: child.id,
          revealDate: defaultRevealDate,
        },
      });
    });

    // Identify + fire the signup event in PostHog. Best-effort —
    // we already committed the vault, so analytics failures must
    // not flip the request to a 500. Clerk lookup is wrapped too
    // in case the user's emails list is empty for some reason.
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
        createdAt: new Date().toISOString(),
      });
      await captureServerEvent(userId, "user_signed_up", {
        firstName,
        childFirstName,
      });
    } catch (err) {
      console.error("[onboarding] posthog identify/capture:", err);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[onboarding] error:", err);
    return NextResponse.json(
      { error: "Something went wrong saving your vault." },
      { status: 500 },
    );
  }
}
