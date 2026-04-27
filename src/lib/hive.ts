// Hive content moderation client.
//
// Two projects, two keys:
//   - HIVE_ACCESS_KEY_ID  → visual content moderation (images + video frames)
//   - HIVE_SECRET_KEY     → text moderation
//
// Fail-open contract: if Hive is misconfigured, returns an error,
// or times out, we NEVER block a user submission. The caller gets
// `state: "FAILED_OPEN"` and moves on. Hive errors go to Sentry
// so we can investigate without breaking the product.
//
// Thresholds + categories are intentionally conservative (0.70
// on the four buckets the brand cares about). Hive's raw class
// names aren't stable across model versions, so we bucket them
// by substring matching — if the model starts emitting new
// class names in the same topic we still catch them.

import * as Sentry from "@sentry/nextjs";

import { signGetUrl } from "@/lib/r2";

export type ModerationCategory = "sexual" | "violence" | "hate" | "drugs";

export interface ModerationScanResult {
  state: "PASS" | "FLAGGED" | "FAILED_OPEN";
  // Per-category confidence (0..1). Only categories that appeared
  // in the Hive response are included. A FLAGGED result always
  // has at least one entry at/above the threshold.
  flags: Partial<Record<ModerationCategory, number>>;
  // Top contributing class names from Hive, for audit / debugging.
  rawTopClasses?: Array<{ className: string; score: number }>;
}

const HIVE_SYNC_URL = "https://api.thehive.ai/api/v2/task/sync";
const FLAG_THRESHOLD = 0.7;
const HIVE_TIMEOUT_MS = 10_000;

// Keyword → category mapping. Case-insensitive substring match
// against Hive's class names. Ordered so the first match wins
// (prevents "suggestive" from being flagged under "violence" if
// class naming shifts).
const CATEGORY_KEYWORDS: Array<[ModerationCategory, string[]]> = [
  ["sexual", ["nsfw", "sexual", "suggestive", "nudity", "porn", "sex"]],
  ["violence", ["gory", "blood", "violence", "violent", "weapon", "gun"]],
  ["hate", ["hate", "racist", "discrimin", "extremist"]],
  ["drugs", ["drug", "alcohol", "smoking", "marijuana"]],
];

function hiveVisualConfigured(): boolean {
  return Boolean(process.env.HIVE_ACCESS_KEY_ID);
}

function hiveTextConfigured(): boolean {
  return Boolean(process.env.HIVE_SECRET_KEY);
}

// Turn Tiptap HTML into plain text for Hive's text endpoint.
// Strip tags, decode the handful of entities Tiptap emits, and
// collapse whitespace so Hive scans content, not markup.
export function stripHtml(input: string): string {
  return input
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function classifyMatch(className: string): ModerationCategory | null {
  const lower = className.toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return null;
}

// Walk Hive's response and collapse the class scores into our
// four buckets. Hive returns arrays of { class, score }; we take
// the MAX score per bucket so one high signal can flag the whole
// category even if other classes in the same bucket are low.
function bucketClasses(
  classes: Array<{ class: string; score: number }>,
): {
  flags: Partial<Record<ModerationCategory, number>>;
  rawTopClasses: Array<{ className: string; score: number }>;
} {
  const flags: Partial<Record<ModerationCategory, number>> = {};
  for (const c of classes) {
    const cat = classifyMatch(c.class);
    if (!cat) continue;
    const current = flags[cat] ?? 0;
    if (c.score > current) flags[cat] = c.score;
  }
  // Top 5 classes (by score) for debugging — clamp to avoid
  // fat payloads in the moderationFlags JSON column.
  const rawTopClasses = [...classes]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((c) => ({ className: c.class, score: c.score }));
  return { flags, rawTopClasses };
}

function resultFromFlags(
  flags: Partial<Record<ModerationCategory, number>>,
  rawTopClasses: Array<{ className: string; score: number }>,
): ModerationScanResult {
  const isFlagged = Object.values(flags).some(
    (score) => (score ?? 0) >= FLAG_THRESHOLD,
  );
  return {
    state: isFlagged ? "FLAGGED" : "PASS",
    flags,
    rawTopClasses,
  };
}

async function callHive(
  apiKey: string,
  body: FormData | string,
  headers: Record<string, string>,
): Promise<Array<{ class: string; score: number }>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HIVE_TIMEOUT_MS);
  // Diagnostic fingerprint for the API key so we can confirm
  // which env var ended up in the request without leaking the
  // secret to logs. Format: first 4 chars + length.
  const keyFingerprint = `${apiKey.slice(0, 4)}…(len=${apiKey.length})`;
  // FormData fields can't be enumerated by fetch, so capture
  // them up-front for the diagnostic log.
  const bodyKeys =
    body instanceof FormData
      ? Array.from(body.keys())
      : ["<string-body>"];
  console.info("[hive] request", {
    url: HIVE_SYNC_URL,
    method: "POST",
    authHeader: `token ${keyFingerprint}`,
    extraHeaders: Object.keys(headers),
    bodyFields: bodyKeys,
  });
  try {
    const res = await fetch(HIVE_SYNC_URL, {
      method: "POST",
      headers: {
        Authorization: `token ${apiKey}`,
        ...headers,
      },
      body: body as BodyInit,
      signal: controller.signal,
    });
    if (!res.ok) {
      // Read the body so we can see whether the 403 came from
      // Hive itself (JSON error envelope) or from a CDN/edge in
      // front (HTML error page, Cloudflare ray ID, etc.).
      const responseText = await res.text().catch(() => "<unreadable>");
      const cfRay = res.headers.get("cf-ray");
      const server = res.headers.get("server");
      const contentType = res.headers.get("content-type");
      console.error("[hive] non-2xx response", {
        url: HIVE_SYNC_URL,
        status: res.status,
        statusText: res.statusText,
        cfRay,
        server,
        contentType,
        bodyPreview: responseText.slice(0, 500),
      });
      throw new Error(`Hive ${res.status} ${res.statusText}`);
    }
    const payload = (await res.json()) as unknown;
    return extractClasses(payload);
  } finally {
    clearTimeout(timer);
  }
}

// Hive's sync response shape — tolerate variants across models.
// `status` is an array, `output` is an array, every entry may
// have a `classes` array OR `result` array with { class, score }.
function extractClasses(
  payload: unknown,
): Array<{ class: string; score: number }> {
  if (!payload || typeof payload !== "object") return [];
  const p = payload as Record<string, unknown>;
  const output = Array.isArray(p.output) ? p.output : [];
  const out: Array<{ class: string; score: number }> = [];
  for (const entry of output) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const classList = (Array.isArray(e.classes) ? e.classes : e.result) as
      | Array<unknown>
      | undefined;
    if (!Array.isArray(classList)) continue;
    for (const c of classList) {
      if (!c || typeof c !== "object") continue;
      const raw = c as Record<string, unknown>;
      const className =
        typeof raw.class === "string"
          ? raw.class
          : typeof raw.name === "string"
            ? raw.name
            : null;
      const score =
        typeof raw.score === "number"
          ? raw.score
          : typeof raw.confidence === "number"
            ? raw.confidence
            : null;
      if (className && score !== null) out.push({ class: className, score });
    }
  }
  return out;
}

/**
 * Scan a single image or video stored in R2. Returns FLAGGED if
 * any of { sexual, violence, hate, drugs } is at/above 0.70, PASS
 * if the scan ran cleanly, FAILED_OPEN if Hive is misconfigured
 * or the API call errored.
 */
export async function scanVisualFromR2(
  r2Key: string,
): Promise<ModerationScanResult> {
  if (!hiveVisualConfigured()) {
    return { state: "FAILED_OPEN", flags: {} };
  }
  try {
    const url = await signGetUrl(r2Key);
    const form = new FormData();
    form.append("url", url);
    const classes = await callHive(
      process.env.HIVE_ACCESS_KEY_ID!,
      form,
      {},
    );
    const { flags, rawTopClasses } = bucketClasses(classes);
    return resultFromFlags(flags, rawTopClasses);
  } catch (err) {
    Sentry.captureException(err, {
      tags: { area: "hive.visual" },
      extra: { r2Key },
    });
    return { state: "FAILED_OPEN", flags: {} };
  }
}

/**
 * Scan a piece of text (letter body). Pass Tiptap HTML or plain
 * text — `stripHtml` happens inline so tags don't count as
 * content. Short texts (<3 chars) are treated as PASS without
 * hitting Hive.
 */
export async function scanText(
  input: string,
): Promise<ModerationScanResult> {
  const plain = stripHtml(input || "");
  if (plain.length < 3) {
    return { state: "PASS", flags: {} };
  }
  if (!hiveTextConfigured()) {
    return { state: "FAILED_OPEN", flags: {} };
  }
  try {
    const form = new FormData();
    form.append("text_data", plain);
    const classes = await callHive(
      process.env.HIVE_SECRET_KEY!,
      form,
      {},
    );
    const { flags, rawTopClasses } = bucketClasses(classes);
    return resultFromFlags(flags, rawTopClasses);
  } catch (err) {
    Sentry.captureException(err, {
      tags: { area: "hive.text" },
      extra: { length: plain.length },
    });
    return { state: "FAILED_OPEN", flags: {} };
  }
}

/**
 * Scan every piece of content on a freshly-created contribution.
 * Collapses per-asset results into a single outcome: if any
 * scan returns FLAGGED the whole contribution is FLAGGED; if
 * all PASS the contribution is PASS; otherwise FAILED_OPEN.
 *
 * Returns the aggregate flags map (max across assets per category)
 * so the admin UI can render the highest-confidence trigger.
 */
export async function scanContribution(params: {
  body: string | null;
  mediaKeys: string[];
  mediaTypes: string[];
}): Promise<ModerationScanResult> {
  const scans: Promise<ModerationScanResult>[] = [];

  if (params.body && params.body.trim()) {
    scans.push(scanText(params.body));
  }

  for (let i = 0; i < params.mediaKeys.length; i++) {
    const key = params.mediaKeys[i];
    const type = params.mediaTypes[i] ?? "";
    // Voice clips skip Hive — audio moderation isn't covered by
    // their visual endpoint, and user spec scopes this to photo
    // and video. Organiser-approval + reveal "Report" button
    // cover voice at launch.
    if (type.startsWith("image/") || type.startsWith("video/")) {
      scans.push(scanVisualFromR2(key));
    }
  }

  if (scans.length === 0) {
    return { state: "PASS", flags: {} };
  }

  const results = await Promise.all(scans);

  // Reduce to a single result. Priority: FLAGGED > FAILED_OPEN > PASS.
  const flags: Partial<Record<ModerationCategory, number>> = {};
  let rawTopClasses: Array<{ className: string; score: number }> = [];
  let anyFlagged = false;
  let anyFailed = false;

  for (const r of results) {
    if (r.state === "FLAGGED") anyFlagged = true;
    if (r.state === "FAILED_OPEN") anyFailed = true;
    for (const [cat, score] of Object.entries(r.flags) as Array<
      [ModerationCategory, number]
    >) {
      const current = flags[cat] ?? 0;
      if (score > current) flags[cat] = score;
    }
    if (r.rawTopClasses && r.rawTopClasses.length > rawTopClasses.length) {
      rawTopClasses = r.rawTopClasses;
    }
  }

  if (anyFlagged) return { state: "FLAGGED", flags, rawTopClasses };
  if (anyFailed) return { state: "FAILED_OPEN", flags };
  return { state: "PASS", flags };
}
