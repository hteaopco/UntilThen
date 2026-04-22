import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin-only read + write of the AppConfig singleton.
 *
 * For now the only field is `paywallEnabled` — the global
 * switch that turns Square payment gating on or off across
 * vault creation + Gift Capsule activation. Seeded as false
 * pre-launch; Jett flips it via /admin → Settings when ready
 * for billing to bite.
 *
 * Auth: the same admin_auth cookie every other /api/admin
 * route uses. Clerk is not involved.
 */
function requireAuth(req: NextRequest): NextResponse | null {
  const auth = req.cookies.get("admin_auth")?.value;
  if (!process.env.ADMIN_PASSWORD || auth !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

async function getOrCreateConfig() {
  const { prisma } = await import("@/lib/prisma");
  // Singleton id is seeded by the migration; the upsert here
  // is belt-and-suspenders for any environment where the seed
  // didn't run (local preview DBs, older branches, etc.).
  return prisma.appConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", paywallEnabled: false },
  });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL is not set." },
      { status: 500 },
    );
  }
  const config = await getOrCreateConfig();
  return NextResponse.json({
    paywallEnabled: config.paywallEnabled,
    updatedAt: config.updatedAt.toISOString(),
  });
}

interface PatchBody {
  paywallEnabled?: boolean;
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  if (!process.env.DATABASE_URL) {
    return NextResponse.json(
      { error: "DATABASE_URL is not set." },
      { status: 500 },
    );
  }

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (typeof body.paywallEnabled !== "boolean") {
    return NextResponse.json(
      { error: "paywallEnabled must be a boolean." },
      { status: 400 },
    );
  }

  const { prisma } = await import("@/lib/prisma");
  const config = await prisma.appConfig.upsert({
    where: { id: "singleton" },
    update: { paywallEnabled: body.paywallEnabled },
    create: {
      id: "singleton",
      paywallEnabled: body.paywallEnabled,
    },
  });

  return NextResponse.json({
    success: true,
    paywallEnabled: config.paywallEnabled,
    updatedAt: config.updatedAt.toISOString(),
  });
}
