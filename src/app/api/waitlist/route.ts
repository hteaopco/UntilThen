import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WaitlistBody {
  email?: string;
  source?: string;
  name?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: WaitlistBody;
  try {
    body = (await req.json()) as WaitlistBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const source = typeof body.source === "string" ? body.source : null;
  const name = typeof body.name === "string" ? body.name : null;

  // Persist if DB is configured. Failures are logged but don't block the
  // user — the form still succeeds so they have a clean experience.
  if (process.env.DATABASE_URL) {
    try {
      const { prisma } = await import("@/lib/prisma");
      await prisma.waitlist.upsert({
        where: { email },
        create: {
          email,
          name: name ?? undefined,
          source: source ?? undefined,
        },
        update: {},
      });
    } catch (err) {
      console.error("[waitlist] db error:", err);
    }
  } else {
    console.log("[waitlist] no DATABASE_URL — captured:", {
      email,
      name,
      source,
    });
  }

  // Send confirmation email if Resend is wired.
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "untilThen <hello@untilthenapp.io>",
        to: email,
        subject: "You're on the list.",
        html: `<p>Hi${name ? ` ${name}` : ""}, thanks for joining the untilThen waitlist.</p><p>We'll be in touch when it's ready.</p>`,
      });
    } catch (err) {
      console.error("[waitlist] resend error:", err);
    }
  } else {
    console.log("[waitlist] no RESEND_API_KEY — skipping confirmation email");
  }

  return NextResponse.json({ success: true });
}
