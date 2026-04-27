import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/**
 * Wedding "Save For Later" — captured from the guest contributor
 * flow when a guest taps "Save For Later" on the invitation card.
 * Persists a WeddingSaveForLater row keyed off the guestToken so
 * a future SMS reminder cron (Twilio TBD) can fire a one-tap link
 * back to the same /wedding/[token] URL.
 *
 * Open route — same trust model as the contribute endpoints
 * downstream of the public guest token. Token validation is
 * the only gate; we accept any plausible name/phone the guest
 * types and lightly normalise the phone.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ guestToken: string }> },
): Promise<NextResponse> {
  const { guestToken } = await ctx.params;
  if (!guestToken)
    return NextResponse.json({ error: "Missing token." }, { status: 400 });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }
  const firstName = (body.firstName ?? "").trim();
  const lastName = (body.lastName ?? "").trim();
  // Strip whitespace + parentheses + dashes for storage; keep
  // a leading "+" so international numbers round-trip cleanly.
  const phone = (body.phone ?? "").trim().replace(/[\s().-]/g, "");

  if (!firstName) return NextResponse.json({ error: "First name is required." }, { status: 400 });
  if (!lastName) return NextResponse.json({ error: "Last name is required." }, { status: 400 });
  if (!phone || phone.replace(/^\+/, "").length < 7)
    return NextResponse.json({ error: "Valid phone is required." }, { status: 400 });

  const { prisma } = await import("@/lib/prisma");
  const capsule = await prisma.memoryCapsule.findUnique({
    where: { guestToken },
    select: { id: true, occasionType: true },
  });
  if (!capsule || capsule.occasionType !== "WEDDING")
    return NextResponse.json({ error: "Not found." }, { status: 404 });

  const row = await prisma.weddingSaveForLater.create({
    data: {
      capsuleId: capsule.id,
      guestToken,
      firstName,
      lastName,
      phone,
    },
  });

  return NextResponse.json({ ok: true, id: row.id });
}
