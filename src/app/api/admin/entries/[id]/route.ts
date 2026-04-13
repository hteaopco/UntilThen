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

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authError = requireAuth(req);
  if (authError) return authError;

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
    await prisma.waitlist.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? (err as { code?: string }).code
        : undefined;
    // P2025 = record not found
    if (code === "P2025") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    console.error("[admin/entries] delete error:", err);
    return NextResponse.json(
      { error: "Failed to delete entry." },
      { status: 500 },
    );
  }
}
