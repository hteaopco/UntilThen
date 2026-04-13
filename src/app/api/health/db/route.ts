import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// Readiness probe: checks the database. Do NOT point Railway's
// healthcheckPath here unless you want DB outages to kill the service.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "up" });
  } catch (err) {
    return NextResponse.json(
      { status: "degraded", db: "down", error: (err as Error).message },
      { status: 503 },
    );
  }
}
