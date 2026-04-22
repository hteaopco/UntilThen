import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PatchBody = {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string | null;
  revealDate?: string | null;
  parentDisplayName?: string | null;
  trusteeName?: string | null;
  trusteeEmail?: string | null;
  trusteePhone?: string | null;
  deliveryTime?: string | null;
  timezone?: string | null;
};

async function requireOwnership(clerkUserId: string, childId: string) {
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true },
  });
  if (!user) return { error: "User not found.", status: 404 as const };
  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: { id: true, parentId: true, vault: { select: { id: true } } },
  });
  if (!child) return { error: "Child not found.", status: 404 as const };
  if (child.parentId !== user.id)
    return { error: "Forbidden.", status: 403 as const };
  return { user, child };
}

function parseDate(value: unknown): Date | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  const { id } = await ctx.params;
  const result = await requireOwnership(userId, id);
  if ("error" in result)
    return NextResponse.json({ error: result.error }, { status: result.status });

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const childData: Record<string, unknown> = {};
  if (typeof body.firstName === "string") {
    const v = body.firstName.trim();
    if (!v)
      return NextResponse.json(
        { error: "Child's name is required." },
        { status: 400 },
      );
    childData.firstName = v;
  }
  if (typeof body.lastName === "string") {
    childData.lastName = body.lastName.trim();
  }
  if ("dateOfBirth" in body) {
    const d = parseDate(body.dateOfBirth);
    if (d === undefined)
      return NextResponse.json(
        { error: "Invalid date of birth." },
        { status: 400 },
      );
    childData.dateOfBirth = d;
  }
  if ("parentDisplayName" in body) {
    const v =
      typeof body.parentDisplayName === "string"
        ? body.parentDisplayName.trim()
        : "";
    if (v.length > 40)
      return NextResponse.json(
        { error: "Display name is too long (40 character max)." },
        { status: 400 },
      );
    childData.parentDisplayName = v.length > 0 ? v : null;
  }
  if ("trusteeName" in body) {
    const v =
      typeof body.trusteeName === "string" ? body.trusteeName.trim() : "";
    childData.trusteeName = v.length > 0 ? v : null;
  }
  if ("trusteeEmail" in body) {
    const v =
      typeof body.trusteeEmail === "string" ? body.trusteeEmail.trim() : "";
    childData.trusteeEmail = v.length > 0 ? v : null;
  }
  if ("trusteePhone" in body) {
    const v =
      typeof body.trusteePhone === "string" ? body.trusteePhone.trim() : "";
    childData.trusteePhone = v.length > 0 ? v : null;
  }
  const { prisma } = await import("@/lib/prisma");

  const previousChild = await prisma.child.findUnique({
    where: { id },
    select: { trusteeEmail: true, firstName: true },
  });

  await prisma.child.update({ where: { id }, data: childData });

  // Send trustee nomination email if trusteeEmail was just set or changed
  if (
    typeof childData.trusteeEmail === "string" &&
    childData.trusteeEmail &&
    childData.trusteeEmail !== previousChild?.trusteeEmail
  ) {
    try {
      const parent = await prisma.user.findUnique({
        where: { id: result.user.id },
        select: { firstName: true },
      });
      const { sendTrusteeNominated } = await import("@/lib/emails");
      await sendTrusteeNominated({
        to: childData.trusteeEmail,
        trusteeName: typeof childData.trusteeName === "string" ? childData.trusteeName : "",
        parentName: parent?.firstName ?? "",
        childName: previousChild?.firstName ?? "",
      });
    } catch (err) {
      console.error("[children PATCH] trustee email failed:", err);
    }
  }

  // Vault fields.
  if (result.child.vault) {
    const vaultData: Record<string, unknown> = {};
    if ("revealDate" in body) {
      const d = parseDate(body.revealDate);
      if (d === undefined)
        return NextResponse.json(
          { error: "Invalid reveal date." },
          { status: 400 },
        );
      vaultData.revealDate = d;
    }
    if ("deliveryTime" in body) {
      const v =
        typeof body.deliveryTime === "string" ? body.deliveryTime.trim() : "";
      if (v && !/^\d{2}:\d{2}$/.test(v))
        return NextResponse.json(
          { error: "Delivery time must be HH:MM." },
          { status: 400 },
        );
      if (v) vaultData.deliveryTime = v;
    }
    if ("timezone" in body) {
      const v = typeof body.timezone === "string" ? body.timezone.trim() : "";
      if (v) vaultData.timezone = v;
    }
    if (Object.keys(vaultData).length > 0) {
      await prisma.vault.update({
        where: { id: result.child.vault.id },
        data: vaultData,
      });
    }
  }

  revalidatePath("/account/capsules");
  revalidatePath(`/account/capsules/${id}`);
  revalidatePath("/dashboard");
  return NextResponse.json({ success: true });
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 500 },
    );
  }

  const { id } = await ctx.params;
  const result = await requireOwnership(userId, id);
  if ("error" in result)
    return NextResponse.json({ error: result.error }, { status: result.status });

  const { prisma } = await import("@/lib/prisma");

  // Manual cascade in the right order so we don't trip foreign-key
  // constraints: entries → collections → vault → child.
  if (result.child.vault) {
    await prisma.entry.deleteMany({ where: { vaultId: result.child.vault.id } });
    await prisma.collection.deleteMany({
      where: { vaultId: result.child.vault.id },
    });
    await prisma.vault.delete({ where: { id: result.child.vault.id } });
  }
  await prisma.child.delete({ where: { id } });

  revalidatePath("/account/capsules");
  revalidatePath("/dashboard");
  return NextResponse.json({ success: true });
}
