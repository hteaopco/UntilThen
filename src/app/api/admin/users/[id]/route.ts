import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireAuth(req: NextRequest): NextResponse | null {
  const auth = req.cookies.get("admin_auth")?.value;
  if (!process.env.ADMIN_PASSWORD || auth !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function parseOptionalDate(value: unknown): Date | null | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return "invalid";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "invalid" : d;
}

// ── PATCH: edit parent + first child + vault reveal date ──

interface PatchBody {
  firstName?: string;
  lastName?: string;
  child?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string | null;
    revealDate?: string | null;
  } | null;
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL is not set." },
      { status: 500 },
    );
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const firstName =
    typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName =
    typeof body.lastName === "string" ? body.lastName.trim() : "";

  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: "Parent first and last name are required." },
      { status: 400 },
    );
  }

  const child = body.child ?? null;
  let childDob: Date | null | undefined;
  let childReveal: Date | null | undefined;

  if (child) {
    if (!child.id) {
      return NextResponse.json({ error: "Child id missing." }, { status: 400 });
    }
    const dob = parseOptionalDate(child.dateOfBirth);
    if (dob === "invalid") {
      return NextResponse.json(
        { error: "Child birthdate is invalid." },
        { status: 400 },
      );
    }
    const reveal = parseOptionalDate(child.revealDate);
    if (reveal === "invalid") {
      return NextResponse.json(
        { error: "Vault reveal date is invalid." },
        { status: 400 },
      );
    }
    childDob = dob;
    childReveal = reveal;
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    const existing = await prisma.user.findUnique({
      where: { id },
      include: { children: { include: { vault: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id },
        data: { firstName, lastName },
      });

      if (child) {
        const existingChild = existing.children.find((c) => c.id === child.id);
        if (existingChild) {
          await tx.child.update({
            where: { id: child.id },
            data: {
              firstName:
                typeof child.firstName === "string"
                  ? child.firstName.trim()
                  : existingChild.firstName,
              lastName:
                typeof child.lastName === "string"
                  ? child.lastName.trim()
                  : existingChild.lastName,
              dateOfBirth: childDob ?? null,
            },
          });
          if (existingChild.vault) {
            await tx.vault.update({
              where: { id: existingChild.vault.id },
              data: { revealDate: childReveal ?? null },
            });
          }
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/users PATCH] error:", err);
    return NextResponse.json(
      { error: "Failed to save user." },
      { status: 500 },
    );
  }
}

// ── DELETE: cascade remove entries, vaults, children, user, clerk user ──

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL is not set." },
      { status: 500 },
    );
  }

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Order matters: every table with a FK pointing at this
      // user (or at this user's children / vaults) has to be
      // cleared before the User row itself can be deleted,
      // otherwise Postgres aborts the transaction on the first
      // violation. Mirrors the self-delete path at /api/account.

      await tx.notificationPreferences.deleteMany({ where: { userId: id } });

      // Entries authored by this user (across any vault).
      await tx.entry.deleteMany({ where: { authorId: id } });

      // All children + vaults belonging to this user.
      const children = await tx.child.findMany({
        where: { parentId: id },
        select: { id: true },
      });
      const childIds = children.map((c) => c.id);
      if (childIds.length > 0) {
        const vaults = await tx.vault.findMany({
          where: { childId: { in: childIds } },
          select: { id: true },
        });
        const vaultIds = vaults.map((v) => v.id);
        if (vaultIds.length > 0) {
          await tx.entry.deleteMany({
            where: { vaultId: { in: vaultIds } },
          });
          await tx.collection.deleteMany({
            where: { vaultId: { in: vaultIds } },
          });
          await tx.vault.deleteMany({ where: { id: { in: vaultIds } } });
        }
        await tx.child.deleteMany({ where: { id: { in: childIds } } });
      }

      // Gift capsules organised by this user — cascade via the
      // MemoryCapsule FKs wired into the schema (contributions +
      // invites cascade on delete).
      await tx.memoryCapsule.deleteMany({ where: { organiserId: id } });

      await tx.user.delete({ where: { id } });
    });

    // Best-effort Clerk account removal. We don't roll back the DB
    // delete if this fails — the orphaned Clerk user can be removed
    // manually from the Clerk dashboard.
    try {
      const clerk = await clerkClient();
      await clerk.users.deleteUser(user.clerkId);
    } catch (err) {
      console.error("[admin/users DELETE] clerk delete failed:", err);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    // Surface the Prisma error code + meta in the server log so
    // the next FK violation points at the blocking table. The
    // admin UI still gets a generic 'Failed to delete user.'
    // message.
    const e = err as {
      code?: string;
      message?: string;
      meta?: unknown;
      stack?: string;
    };
    console.error(
      "[admin/users DELETE] error:",
      JSON.stringify(
        { id, code: e.code, message: e.message, meta: e.meta },
        null,
        2,
      ),
    );
    if (e.stack) console.error("[admin/users DELETE] stack:", e.stack);
    return NextResponse.json(
      { error: "Failed to delete user." },
      { status: 500 },
    );
  }
}
