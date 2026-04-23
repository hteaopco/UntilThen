import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Toggle free-access flags on a single User row from /admin.
 *
 * Two independent flags:
 *   - freeVaultAccess — bypass the subscription gate for vault
 *                       (Time Capsule) creation
 *   - freeGiftAccess  — bypass the $9.99 per-capsule Gift Capsule
 *                       charge
 *
 * Either or both can be patched in a single call. Unspecified
 * fields are left untouched so the UI can optimistically PATCH
 * just the flag the admin clicked without sending the other.
 */
function requireAuth(req: NextRequest): NextResponse | null {
  const auth = req.cookies.get("admin_auth")?.value;
  if (!process.env.ADMIN_PASSWORD || auth !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

interface PatchBody {
  freeVaultAccess?: boolean;
  freeGiftAccess?: boolean;
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
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.freeVaultAccess === "boolean") {
    data.freeVaultAccess = body.freeVaultAccess;
  }
  if (typeof body.freeGiftAccess === "boolean") {
    data.freeGiftAccess = body.freeGiftAccess;
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No flags provided." },
      { status: 400 },
    );
  }

  const { prisma } = await import("@/lib/prisma");
  try {
    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        freeVaultAccess: true,
        freeGiftAccess: true,
      },
    });

    await logAdminAction(
      req,
      "user.free-access",
      { type: "User", id },
      data,
    );

    return NextResponse.json({ success: true, user });
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code === "P2025") {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    console.error("[admin/users/free-access] error:", e);
    return NextResponse.json(
      { error: "Failed to update access." },
      { status: 500 },
    );
  }
}
