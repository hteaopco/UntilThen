import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  firstName?: string;
  childName?: string;
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
  const childName =
    typeof body.childName === "string" ? body.childName.trim() : "";

  if (!firstName || !childName) {
    return NextResponse.json(
      { error: "Please enter your first name and your child's name." },
      { status: 400 },
    );
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    // Idempotent: if the user already onboarded, don't duplicate rows.
    const existing = await prisma.user.findUnique({
      where: { clerkId: userId },
    });
    if (existing) {
      return NextResponse.json({ success: true, alreadyOnboarded: true });
    }

    // One-shot: create User + first Child + empty Vault atomically.
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          clerkId: userId,
          firstName,
          role: "PARENT",
        },
      });
      const child = await tx.child.create({
        data: {
          name: childName,
          parentId: user.id,
        },
      });
      await tx.vault.create({
        data: { childId: child.id },
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
