import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PatchBody = {
  writingReminders?: boolean;
  milestoneReminders?: boolean;
  vaultAnniversary?: boolean;
  revealCountdown?: boolean;
  pausedUntil?: string | null;
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
    select: { id: true },
  });
  if (!user)
    return NextResponse.json({ error: "User not found." }, { status: 404 });

  const prefs = await prisma.notificationPreferences.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });
  return NextResponse.json(prefs);
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!user)
    return NextResponse.json({ error: "User not found." }, { status: 404 });

  const data: Record<string, unknown> = {};
  for (const key of [
    "writingReminders",
    "milestoneReminders",
    "vaultAnniversary",
    "revealCountdown",
  ] as const) {
    if (typeof body[key] === "boolean") data[key] = body[key];
  }
  if ("pausedUntil" in body) {
    if (body.pausedUntil === null) {
      data.pausedUntil = null;
    } else if (typeof body.pausedUntil === "string") {
      const d = new Date(body.pausedUntil);
      if (Number.isNaN(d.getTime()))
        return NextResponse.json(
          { error: "Invalid pausedUntil date." },
          { status: 400 },
        );
      data.pausedUntil = d;
    }
  }

  await prisma.notificationPreferences.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, ...data },
  });
  revalidatePath("/account/notifications");
  return NextResponse.json({ success: true });
}
