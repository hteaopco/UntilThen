import { NextResponse, type NextRequest } from "next/server";

import { sendSms } from "@/lib/sms";

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
 * Persists a WeddingSaveForLater row keyed off the guestToken
 * AND fires an immediate SMS with the contribution link so the
 * guest has it in their text history whenever they're ready.
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
    select: { id: true, occasionType: true, recipientName: true },
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

  // Fire the reminder text right away. The whole point of
  // "Save For Later" is that the guest doesn't have time
  // *now* — putting the link in their text history means it's
  // there whenever they pick up their phone next. We only
  // promote phone to E.164 if the user typed a US-style
  // 10-digit number; everything else passes through assuming
  // the guest knew what they were doing.
  const e164Phone = toE164(phone);
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://untilthenapp.io";
  const smsBody = buildSmsBody({
    firstName,
    coupleNames: deriveCoupleDisplay(capsule.recipientName),
    url: `${origin}/wedding/${guestToken}`,
  });
  const sid = await sendSms({ to: e164Phone, body: smsBody });
  if (sid) {
    await prisma.weddingSaveForLater.update({
      where: { id: row.id },
      data: { reminderSent: true, reminderSentAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true, id: row.id });
}

/** Promote bare US 10-digit / 1-prefixed numbers to E.164.
 *  Anything already starting with "+" passes through; any
 *  other shape passes through too — Twilio will tell us. */
function toE164(phone: string): string {
  if (phone.startsWith("+")) return phone;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return phone;
}

/** "Alex Smith & Jordan Smith" → "Alex & Jordan". Falls back
 *  to the first whole name when the recipient isn't a couple. */
function deriveCoupleDisplay(recipientName: string): string {
  if (!recipientName.includes("&")) {
    return recipientName.split(" ")[0] ?? recipientName;
  }
  const [a = "", b = ""] = recipientName.split("&");
  const f1 = a.trim().split(" ")[0] ?? "";
  const f2 = b.trim().split(" ")[0] ?? "";
  if (!f1) return recipientName;
  if (!f2) return f1;
  return `${f1} & ${f2}`;
}

function buildSmsBody({
  firstName,
  coupleNames,
  url,
}: {
  firstName: string;
  coupleNames: string;
  url: string;
}): string {
  return `Hi ${firstName}! Here's your link to leave a wedding memory for ${coupleNames} when you have a moment: ${url}\n\nThanks for sharing in their day.`;
}

