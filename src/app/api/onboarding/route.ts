import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[onboarding] error:", err);
    return NextResponse.json(
      { error: "Something went wrong saving your vault." },
      { status: 500 },
    );
  }
}
