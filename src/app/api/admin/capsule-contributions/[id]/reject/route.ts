import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = req.cookies.get("admin_auth")?.value;
  if (!process.env.ADMIN_PASSWORD || auth !== process.env.ADMIN_PASSWORD)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const { prisma } = await import("@/lib/prisma");
  await prisma.capsuleContribution.update({
    where: { id },
    data: { approvalStatus: "REJECTED" },
  });
  return NextResponse.json({ success: true });
}
