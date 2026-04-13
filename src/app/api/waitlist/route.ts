import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface WaitlistBody {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  dateOfBirth?: string;
  numChildren?: number | string;
  hearAboutUs?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function POST(req: Request) {
  let body: WaitlistBody;
  try {
    body = (await req.json()) as WaitlistBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const firstName = cleanString(body.firstName);
  const lastName = cleanString(body.lastName);
  const numChildrenNum =
    typeof body.numChildren === "number"
      ? body.numChildren
      : typeof body.numChildren === "string"
        ? parseInt(body.numChildren, 10)
        : NaN;

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }
  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: "First and last name are required." },
      { status: 400 },
    );
  }
  if (![1, 2, 3, 4].includes(numChildrenNum)) {
    return NextResponse.json(
      { error: "Please select how many children you have." },
      { status: 400 },
    );
  }

  const phone = cleanString(body.phone);
  const hearAboutUs = cleanString(body.hearAboutUs);
  const dateOfBirthRaw = cleanString(body.dateOfBirth);
  let dateOfBirth: Date | undefined;
  if (dateOfBirthRaw) {
    const parsed = new Date(dateOfBirthRaw);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json(
        { error: "Date of birth is invalid." },
        { status: 400 },
      );
    }
    dateOfBirth = parsed;
  }

  // IP for rough dedup — not stored if DATABASE_URL is missing.
  const forwarded = req.headers.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;

  // Persist
  if (process.env.DATABASE_URL) {
    try {
      const { prisma } = await import("@/lib/prisma");
      await prisma.waitlist.create({
        data: {
          email,
          firstName,
          lastName,
          phone: phone ?? null,
          dateOfBirth: dateOfBirth ?? null,
          numChildren: numChildrenNum,
          hearAboutUs: hearAboutUs ?? null,
          ipAddress: ipAddress ?? null,
        },
      });
    } catch (err: unknown) {
      // Prisma P2002 = unique constraint violation -> already on list.
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? (err as { code?: string }).code
          : undefined;
      if (code === "P2002") {
        return NextResponse.json({ error: "already_exists" }, { status: 409 });
      }
      console.error("[waitlist] db error:", err);
      return NextResponse.json(
        { error: "Something went wrong saving your signup." },
        { status: 500 },
      );
    }
  } else {
    // No DB wired yet — accept the submission so the UX still flows.
    console.log("[waitlist] no DATABASE_URL — captured (not persisted)");
  }

  // Confirmation email (best-effort).
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        // TEMP: using Resend's shared sender until the untilthenapp.io
        // domain is verified. Swap back to "hello@untilthenapp.io" once
        // the domain is live in Resend.
        from: "untilThen <onboarding@resend.dev>",
        to: email,
        subject: "You're on the list.",
        html: `
<div style="font-family: 'DM Sans', -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; color: #0f1f3d;">
  <h1 style="font-size: 28px; font-weight: 800; color: #0f1f3d; margin: 0 0 12px; letter-spacing: -0.5px;">
    You&rsquo;re on the list, ${escapeHtml(firstName)}.
  </h1>
  <p style="font-size: 16px; color: #4a5568; line-height: 1.7; margin: 0 0 20px;">
    We&rsquo;re building something we think you&rsquo;ll love — a place to write letters, record voice notes, and capture memories your child will open when they&rsquo;re ready.
  </p>
  <p style="font-size: 16px; color: #4a5568; line-height: 1.7; margin: 0 0 32px;">
    We&rsquo;ll be in touch when untilThen launches. In the meantime, maybe think about what you&rsquo;d write in your first letter.
  </p>
  <div style="border-top: 1px solid #e2e8f0; padding-top: 20px;">
    <p style="font-size: 13px; color: #8896a5; margin: 0; font-style: italic;">
      — the untilThen team
    </p>
  </div>
</div>`,
      });
    } catch (err) {
      console.error("[waitlist] resend error:", err);
      // swallow — the user is still on the list even if email fails.
    }
  }

  return NextResponse.json({ success: true });
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
