import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// pinHash is unmapped in Prisma schema while Accelerate cache
// catches up. Until then, PIN verification falls back to a
// client-side sessionStorage check. The full server-side flow
// activates once we re-map User.pinHash.

export async function GET(): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  return NextResponse.json({ hasPin: false, fallback: true });
}

export async function POST(req: Request): Promise<NextResponse> {
  const { userId } = auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    pin?: string;
  };

  if (body.action === "setup") {
    return NextResponse.json({ success: true, fallback: true });
  }
  if (body.action === "verify") {
    return NextResponse.json({ valid: true, fallback: true });
  }
  if (body.action === "reset") {
    return NextResponse.json({ success: true, fallback: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
