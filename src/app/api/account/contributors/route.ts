import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<NextResponse> {
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
    include: { children: { include: { vault: true } } },
  });
  if (!user)
    return NextResponse.json({ error: "User not found." }, { status: 404 });

  const vaultIds = user.children
    .map((c) => c.vault?.id)
    .filter((id): id is string => Boolean(id));

  const requestedVault = req.nextUrl.searchParams.get("vault");
  const vaultFilter =
    requestedVault && vaultIds.includes(requestedVault)
      ? [requestedVault]
      : vaultIds;

  const contributors = await prisma.contributor.findMany({
    where: { vaultId: { in: vaultFilter } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ contributors });
}
