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
  deliveryTime?: string | null;
  timezone?: string | null;
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
 * Paywall gating is applied here, not at the UI layer only, so a
 * client-side bypass can't create unauthorised vaults. Three
 * reject paths:
 *
 *   409 { needsSubscription: true }
 *     Paywall is on and the user has no active subscription or
 *     freeVaultAccess. Client renders SubscriptionCheckout.
 *
 *   409 { needsAddOn: true, plan: "MONTHLY"|"ANNUAL" }
 *     User has an active subscription but has used all base +
 *     add-on capsule slots. Client renders AddOnCheckout for
 *     their plan's cadence.
 *
 *   When paywall is off or user is comped (freeVaultAccess),
 *   the endpoint proceeds as before.
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
    select: {
      id: true,
      subscription: {
        select: {
          plan: true,
          status: true,
          baseCapsuleCount: true,
          addonCapsuleCount: true,
        },
      },
      _count: { select: { children: true } },
    },
  });
  if (!user)
    return NextResponse.json({ error: "User not found." }, { status: 404 });

  // Capsule-slot enforcement. Unsubscribed users stay free to
  // create (enticement flow — they can set up the capsule without
  // committing). Subscribed users are strictly limited to the
  // slots they've paid for: base + addons. Creating a fourth
  // capsule on a 3-slot plan returns 409 { needsAddOn: true } and
  // AddChildModal mounts AddOnCheckout to buy the extra slot.
  if (user.subscription && user.subscription.status === "ACTIVE") {
    const allowed =
      user.subscription.baseCapsuleCount + user.subscription.addonCapsuleCount;
    if (user._count.children >= allowed) {
      return NextResponse.json(
        {
          error:
            "You've used every slot on your plan. Add one before creating another capsule.",
          needsAddOn: true,
          plan: user.subscription.plan,
          usedSlots: user._count.children,
          allowedSlots: allowed,
        },
        { status: 409 },
      );
    }
  }

  // Default reveal = child's 18th birthday if we have a DOB.
  const defaultReveal = dateOfBirth
    ? new Date(dateOfBirth.getTime())
    : null;
  if (defaultReveal) defaultReveal.setFullYear(defaultReveal.getFullYear() + 18);
  const revealDate = explicitReveal ?? defaultReveal ?? null;

  const deliveryTime =
    typeof body.deliveryTime === "string" &&
    /^\d{2}:\d{2}$/.test(body.deliveryTime.trim())
      ? body.deliveryTime.trim()
      : undefined;
  const timezone =
    typeof body.timezone === "string" && body.timezone.trim()
      ? body.timezone.trim()
      : undefined;

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
          ...(deliveryTime ? { deliveryTime } : {}),
          ...(timezone ? { timezone } : {}),
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
