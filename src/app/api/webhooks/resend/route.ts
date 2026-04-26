import crypto from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resend webhook receiver. Resend uses Svix for delivery, so the
 * signature scheme is the standard Svix one:
 *
 *   svix-id        — unique message id (also the replay key)
 *   svix-timestamp — UNIX seconds, message must be < 5 min old
 *   svix-signature — space-separated list of "v1,<base64sig>"
 *                    entries. We accept the message if ANY one
 *                    matches HMAC-SHA256(secret, "${id}.${ts}.${body}").
 *
 * Configure the endpoint in the Resend dashboard:
 *   Webhooks → Add endpoint → https://untilthenapp.io/api/webhooks/resend
 *   Subscribe to: email.delivered, email.bounced, email.complained
 *   Copy the signing secret into RESEND_WEBHOOK_SECRET
 *   (it's prefixed `whsec_` — we strip and base64-decode below).
 *
 * The handler is idempotent at the Svix-id layer: if a row with
 * the same (messageId, event, recipient) already exists from a
 * prior delivery attempt we skip the insert. Resend retries for
 * up to 24h on non-2xx so dupes are normal.
 */

const REPLAY_WINDOW_SEC = 5 * 60;

type ResendEvent = {
  type: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string | string[];
    tags?: Array<{ name: string; value: string }>;
  };
};

const TYPE_MAP: Record<string, "DELIVERED" | "BOUNCED" | "COMPLAINED"> = {
  "email.delivered": "DELIVERED",
  "email.bounced": "BOUNCED",
  "email.complained": "COMPLAINED",
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhooks/resend] RESEND_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  // Replay window check — Svix recommends 5 min.
  const tsSec = Number.parseInt(svixTimestamp, 10);
  if (!Number.isFinite(tsSec)) {
    return NextResponse.json({ error: "Bad timestamp" }, { status: 401 });
  }
  const ageSec = Math.abs(Math.floor(Date.now() / 1000) - tsSec);
  if (ageSec > REPLAY_WINDOW_SEC) {
    return NextResponse.json({ error: "Stale timestamp" }, { status: 401 });
  }

  // Read raw body BEFORE JSON.parse — signature is computed over
  // exact bytes; one char of re-serialisation drift breaks it.
  const rawBody = await req.text();

  if (!verifySvixSignature(secret, svixId, svixTimestamp, rawBody, svixSignature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: ResendEvent;
  try {
    event = JSON.parse(rawBody) as ResendEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const mapped = TYPE_MAP[event.type];
  if (!mapped) {
    // Subscribed to a wider set than we model — ack so Resend
    // doesn't retry, but don't write anything.
    return NextResponse.json({ ok: true, ignored: event.type });
  }

  const messageId = event.data?.email_id;
  const recipient = Array.isArray(event.data?.to)
    ? event.data?.to[0]
    : event.data?.to;
  if (!messageId || !recipient) {
    console.warn("[webhooks/resend] missing email_id or recipient", event.type);
    return NextResponse.json({ ok: true, ignored: "incomplete" });
  }

  const capsuleId =
    event.data?.tags?.find((t) => t.name === "capsuleId")?.value ?? null;

  try {
    await prisma.emailEvent.create({
      data: {
        messageId,
        event: mapped,
        recipient,
        capsuleId,
      },
    });
  } catch (err) {
    console.error("[webhooks/resend] insert failed:", err);
    // 500 → Resend will retry. Better than silently losing the
    // event when Postgres is briefly unreachable.
    return NextResponse.json({ error: "Insert failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Svix signature verification, no external dep. Secret arrives as
 * "whsec_<base64>"; the actual HMAC key is the base64-decoded
 * payload after the prefix. The signature header carries one or
 * more whitespace-separated "v1,<base64>" entries — we recompute
 * once and compare against each in constant time.
 */
function verifySvixSignature(
  secret: string,
  svixId: string,
  svixTimestamp: string,
  rawBody: string,
  signatureHeader: string,
): boolean {
  const cleaned = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let key: Buffer;
  try {
    key = Buffer.from(cleaned, "base64");
  } catch {
    return false;
  }
  if (key.length === 0) return false;

  const signedPayload = `${svixId}.${svixTimestamp}.${rawBody}`;
  const expected = crypto
    .createHmac("sha256", key)
    .update(signedPayload)
    .digest("base64");
  const expectedBuf = Buffer.from(expected, "base64");

  for (const entry of signatureHeader.split(/\s+/)) {
    const [version, sig] = entry.split(",", 2);
    if (version !== "v1" || !sig) continue;
    let candidate: Buffer;
    try {
      candidate = Buffer.from(sig, "base64");
    } catch {
      continue;
    }
    if (
      candidate.length === expectedBuf.length &&
      crypto.timingSafeEqual(candidate, expectedBuf)
    ) {
      return true;
    }
  }
  return false;
}
