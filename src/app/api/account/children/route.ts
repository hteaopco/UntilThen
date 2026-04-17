import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateBody = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string | null;
  revealDate?: string | null;
  deliveryTime?: string;
  timezone?: string;
};

export async function GET(): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: {
      children: {
        include: { vault: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!user)
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  return NextResponse.json({ children: user.children });
}

/**
 * Create a new child + vault for the current parent. Mirrors the
 * onboarding flow (transactional insert, reveal date defaults to
 * the child's 18th birthday when a DOB is supplied).
 *
 * TODO: gate this behind the Square billing integration — the +$1.99/mo
 * charge per additional vault applies from the second child onwards.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const firstName =
    typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName =
    typeof body.lastName === "string" ? body.lastName.trim() : "";
  if (!firstName) {
    return NextResponse.json(
      { error: "Child's first name is required." },
      { status: 400 },
    );
  }

  let dateOfBirth: Date | null = null;
  if (typeof body.dateOfBirth === "string" && body.dateOfBirth.trim()) {
    const parsed = new Date(body.dateOfBirth);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json(
        { error: "Invalid date of birth." },
        { status: 400 },
      );
    }
    dateOfBirth = parsed;
  }

  let explicitReveal: Date | null = null;
  if (typeof body.revealDate === "string" && body.revealDate.trim()) {
    const parsed = new Date(body.revealDate);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json(
        { error: "Invalid reveal date." },
        { status: 400 },
      );
    }
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (parsed.getTime() < todayStart.getTime()) {
      return NextResponse.json(
        { error: "Reveal date can't be in the past." },
        { status: 400 },
      );
    }
    explicitReveal = parsed;
  }

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!user)
    return NextResponse.json({ error: "User not found." }, { status: 404 });

  // Default reveal = child's 18th birthday if we have a DOB.
  const defaultReveal = dateOfBirth
    ? new Date(dateOfBirth.getTime())
    : null;
  if (defaultReveal) defaultReveal.setFullYear(defaultReveal.getFullYear() + 18);
  const revealDate = explicitReveal ?? defaultReveal ?? null;

  try {
    const child = await prisma.$transaction(async (tx) => {
      const created = await tx.child.create({
        data: {
          firstName,
          lastName,
          dateOfBirth,
          parentId: user.id,
        },
      });
      await tx.vault.create({
        data: {
          childId: created.id,
          revealDate,
        },
      });
      return created;
    });

    revalidatePath("/dashboard");
    revalidatePath("/account/capsules");
    return NextResponse.json({ success: true, id: child.id });
  } catch (err) {
    console.error("[account/children POST] error:", err);
    return NextResponse.json(
      { error: "Couldn't create the vault." },
      { status: 500 },
    );
  }
}
