import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { password?: string };
  try {
    body = (await req.json()) as { password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: "Admin is not configured. Set ADMIN_PASSWORD." },
      { status: 500 },
    );
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    // Small delay to discourage brute force from the same connection.
    await new Promise((r) => setTimeout(r, 300));
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: "admin_auth",
    value: password,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set({
    name: "admin_auth",
    value: "",
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
