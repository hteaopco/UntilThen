import { NextResponse, type NextRequest } from "next/server";

import {
  sendAccountRecoveryConfirmation,
  sendAccountRecoveryRequest,
} from "@/lib/emails";
import { checkRateLimit, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Public endpoint — form on /help/recovery submits here when a
// user has lost access to their email and needs an admin to
// verify identity + update the Clerk email manually.
//
// The middleware matcher includes this path under isPublicRoute,
// but it does NOT classify it for rate limiting (the path
// starts with /api/help which rateLimitKindFor doesn't match).
// We apply the limit inline instead to keep the form-spam
// defense local to this route.

interface RecoveryBody {
  originalEmail?: unknown;
  newEmail?: unknown;
  fullName?: unknown;
  childFirstName?: unknown;
  approximateSignupDate?: unknown;
  details?: unknown;
}

function cleanString(input: unknown, maxLen: number): string {
  if (typeof input !== "string") return "";
  return input.trim().slice(0, maxLen);
}

function isEmailish(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = clientIp(req.headers);
  const { success } = await checkRateLimit("email", ip);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in a few minutes." },
      { status: 429 },
    );
  }

  let body: RecoveryBody;
  try {
    body = (await req.json()) as RecoveryBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const originalEmail = cleanString(body.originalEmail, 200).toLowerCase();
  const newEmail = cleanString(body.newEmail, 200).toLowerCase();
  const fullName = cleanString(body.fullName, 120);
  const childFirstName = cleanString(body.childFirstName, 80);
  const approximateSignupDate = cleanString(body.approximateSignupDate, 60);
  const details = cleanString(body.details, 4000);

  const errors: string[] = [];
  if (!isEmailish(originalEmail))
    errors.push("Original email address doesn't look right.");
  if (!isEmailish(newEmail))
    errors.push("New email address doesn't look right.");
  if (originalEmail && newEmail && originalEmail === newEmail)
    errors.push("New email must be different from the original.");
  if (fullName.length < 2)
    errors.push("Please enter the full name on the account.");
  if (childFirstName.length < 1)
    errors.push("Please enter the child's first name.");
  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(" ") }, { status: 400 });
  }

  const userAgent = req.headers.get("user-agent") ?? "(unknown)";

  // Best-effort — if Resend isn't configured the send helper
  // no-ops silently. Either way we return success so we don't
  // leak support-inbox configuration to the form.
  await sendAccountRecoveryRequest({
    originalEmail,
    newEmail,
    fullName,
    childFirstName,
    approximateSignupDate: approximateSignupDate || "(not provided)",
    details: details || "(no additional details)",
    ipAddress: ip,
    userAgent,
  });
  await sendAccountRecoveryConfirmation({ to: newEmail, fullName });

  return NextResponse.json({ success: true });
}
