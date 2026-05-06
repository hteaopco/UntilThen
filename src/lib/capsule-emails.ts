// Resend email helpers for Gift Capsules. Best-effort — failed
// sends log and move on, never fail the parent request.

import {
  TONE_EMOJI,
  TONE_HERO,
  TONE_THANKYOU,
  TONE_UNLOCK_LINE,
  toneClosingLine,
  type CapsuleTone,
} from "@/lib/tone";

const FROM = "untilThen <hello@untilthenapp.io>";
const REPLY_TO = "hello@untilthenapp.io";

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://untilthenapp.io";
}

function wrap(body: string): string {
  return `<div style="font-family:'DM Sans',-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;color:#0f1f3d;">${body}</div>`;
}

function cta(href: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${href}" style="display:inline-block;background:#c47a3a;color:#ffffff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">${label}</a></p>`;
}

function firstName(name: string): string {
  return name.split("&")[0]?.trim().split(" ")[0] ?? name;
}

function isCouple(name: string): boolean {
  return name.includes("&");
}

/**
 * Recipient-pronoun helper. Used in copy where the recipient's
 * name has already appeared earlier in the same paragraph and
 * repeating it would read clunky.
 *
 * Singular default: "they/them/their/they'll". Couple capsules
 * (recipientName contains "&") render the same. We dropped
 * gendered output (she/her, he/him) because asking organisers
 * for a gender to drive copy was both intrusive and unnecessary
 * \u2014 the name carries the identity, the pronoun stays neutral.
 */
function pronoun(_name: string, form: "object" | "subject" | "possessive" | "contraction"): string {
  return form === "object"
    ? "them"
    : form === "subject"
      ? "they"
      : form === "possessive"
        ? "their"
        : "they\u2019ll";
}

function displayName(name: string): string {
  if (!isCouple(name)) return firstName(name);
  const parts = name.split("&");
  const n1 = (parts[0] ?? "").trim().split(" ")[0] ?? "";
  const n2 = (parts[1] ?? "").trim().split(" ")[0] ?? "";
  return `${n1} &amp; ${n2}`;
}

function displayNamePlain(name: string): string {
  if (!isCouple(name)) return firstName(name);
  const parts = name.split("&");
  const n1 = (parts[0] ?? "").trim().split(" ")[0] ?? "";
  const n2 = (parts[1] ?? "").trim().split(" ")[0] ?? "";
  return `${n1} & ${n2}`;
}

function body(text: string): string {
  return `<p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 12px;">${text}</p>`;
}

function muted(text: string): string {
  return `<p style="font-size:14px;color:#8896a5;line-height:1.6;margin:0 0 12px;">${text}</p>`;
}

function heading(text: string): string {
  return `<h1 style="font-size:24px;font-weight:800;margin:0 0 16px;letter-spacing:-0.5px;">${text}</h1>`;
}

async function send(opts: {
  to: string;
  subject: string;
  html: string;
  /** Forwarded as Resend tags. The webhook reads `capsuleId` back
   *  out of the event payload to link the EmailEvent row to a
   *  MemoryCapsule. */
  tags?: Record<string, string>;
}): Promise<string | null> {
  if (!process.env.RESEND_API_KEY) return null;
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    const tagList = opts.tags
      ? Object.entries(opts.tags).map(([name, value]) => ({ name, value }))
      : undefined;
    const result = await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      ...(tagList ? { tags: tagList } : {}),
    });
    return result.data?.id ?? null;
  } catch (err) {
    console.error("[capsule-emails] send failed:", err);
    return null;
  }
}

// #1 — Invite Contributor
export async function sendCapsuleInvite(params: {
  to: string;
  contributorName: string | null;
  organiserName: string;
  title: string;
  recipientName: string;
  revealDate: Date;
  inviteToken: string;
  /** When set, replaces the default subject line. */
  customSubject?: string | null;
  /** When set, replaces the standard template body paragraphs.
   *  Newlines become separate paragraphs. Heading + CTA stay locked. */
  customBody?: string | null;
}): Promise<void> {
  const url = `${baseUrl()}/contribute/capsule/${params.inviteToken}`;
  const subject = params.customSubject?.trim() ||
    `Add your message for ${displayNamePlain(params.recipientName)}.`;
  const bodyContent = params.customBody?.trim()
    ? params.customBody.trim().split(/\n+/).map((l) => body(escapeHtml(l.trim()))).filter(Boolean).join("")
    : [
        body("<strong>A message. A memory.</strong> Something " + pronoun(params.recipientName, "contraction") + " open and feel for years."),
        body("You can write a note, record a voice message, or share a photo or video."),
        body("It only takes a minute &mdash; and it&rsquo;s something " + pronoun(params.recipientName, "contraction") + " keep forever."),
      ].join("");
  await send({
    to: params.to,
    subject,
    html: wrap(`
      ${heading("You&rsquo;ve been invited by " + escapeHtml(params.organiserName) + " to create something for " + displayName(params.recipientName) + ".")}
      ${bodyContent}
      ${cta(url, "Leave your message")}
    `),
  });
}

// #3 — Draft Expiring (Day 6)
export async function sendCapsuleDraftExpiring(params: {
  to: string;
  title: string;
  dashboardUrl: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: "Don\u2019t lose this.",
    html: wrap(`
      ${heading("Your capsule expires tomorrow.")}
      ${body("You&rsquo;ve already started something meaningful &mdash; don&rsquo;t let it disappear.")}
      ${muted("Finish it now so it&rsquo;s there when it matters most.")}
      ${cta(params.dashboardUrl, "Finish your capsule")}
    `),
  });
}

// #4 — Contribution Submitted → Organiser
export async function sendCapsuleContributionSubmitted(params: {
  to: string;
  contributorName: string;
  title: string;
  dashboardUrl: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: `Someone just added something for ${params.title.split(" ")[0]}`,
    html: wrap(`
      ${heading("A new memory was added to your capsule.")}
      ${body("You can review it, edit it, or approve it before it&rsquo;s sealed.")}
      ${cta(params.dashboardUrl, "Review contribution")}
    `),
  });
}

// #5 — Contributor Reminder (48hr Deadline)
export async function sendCapsuleContributorReminder(params: {
  to: string;
  contributorName: string | null;
  title: string;
  recipientName: string;
  inviteToken: string;
}): Promise<void> {
  const url = `${baseUrl()}/contribute/capsule/${params.inviteToken}`;
  await send({
    to: params.to,
    subject: "Don\u2019t miss this.",
    html: wrap(`
      ${heading("You were invited to leave a message for " + displayName(params.recipientName) + ".")}
      ${body("Take a minute to write something " + pronoun(params.recipientName, "contraction") + " keep forever.")}
      ${cta(url, "Leave your message")}
    `),
  });
}

// #6 — Reveal Day (Recipient)
export async function sendCapsuleRevealDay(params: {
  to: string;
  recipientName: string;
  title: string;
  capsuleId: string;
  accessToken: string;
  /** Capsule tone — drives subject, heading, body, and closing
   *  line. Falls back to OTHER (the existing generic copy) when
   *  unknown / missing so older callers keep working. */
  tone?: CapsuleTone | null;
  /** When set, replaces the default tone-derived subject line. */
  customSubject?: string | null;
  /** When set, inserted between the standard greeting and the CTA
   *  as a personal note from the organiser to the recipient. */
  customBody?: string | null;
}): Promise<void> {
  const url = `${baseUrl()}/reveal/${params.accessToken}`;
  const tone: CapsuleTone = params.tone ?? "OTHER";
  const emoji = TONE_EMOJI[tone];
  const hero = TONE_HERO[tone];
  const unlock = TONE_UNLOCK_LINE[tone];
  const closing = toneClosingLine(tone);
  const subject = params.customSubject?.trim() || hero;
  const organiserNote = params.customBody?.trim()
    ? params.customBody.trim().split(/\n+/).map((l) => body(escapeHtml(l.trim()))).filter(Boolean).join("")
    : "";
  await send({
    to: params.to,
    subject,
    html: wrap(`
      ${heading(emoji + " " + hero)}
      ${body(unlock)}
      ${organiserNote}
      ${muted(closing)}
      ${cta(url, "Open your capsule")}
    `),
    tags: { capsuleId: params.capsuleId },
  });
}

// #7 — New Link Requested
export async function sendCapsuleNewLink(params: {
  to: string;
  recipientName: string;
  title: string;
  capsuleId: string;
  accessToken: string;
}): Promise<void> {
  const url = `${baseUrl()}/reveal/${params.accessToken}`;
  await send({
    to: params.to,
    subject: "Here\u2019s your new link",
    html: wrap(`
      ${heading("Your messages are waiting.")}
      ${body("We&rsquo;ve generated a new link for you. Whenever you&rsquo;re ready, everything is waiting.")}
      ${cta(url, "Open your capsule")}
    `),
    tags: { capsuleId: params.capsuleId },
  });
}

// #9 — Contributor Confirmation
export async function sendContributorConfirmation(params: {
  to: string;
  contributorName: string;
  recipientName: string;
  capsuleTitle: string;
  messagePreview: string | null;
  editUrl: string;
  /** Capsule tone — drives subject (TONE_THANKYOU). Falls back to
   *  OTHER's generic "That's going to mean a lot to them." when
   *  unknown so older callers keep working. */
  tone?: CapsuleTone | null;
}): Promise<void> {
  const tone: CapsuleTone = params.tone ?? "OTHER";
  const subjectPronoun = pronoun(params.recipientName, "object");
  const preview = params.messagePreview
    ? `<div style="margin:16px 0;padding:16px;background:#fdf8f2;border-radius:12px;border:1px solid rgba(196,122,58,0.15);">
        <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;color:#8896a5;margin:0 0 8px;">Your message</p>
        <p style="font-size:14px;color:#0f1f3d;line-height:1.6;margin:0;">${escapeHtml(params.messagePreview.slice(0, 500))}</p>
      </div>`
    : "";
  await send({
    to: params.to,
    subject: TONE_THANKYOU[tone](subjectPronoun),
    html: wrap(`
      ${heading("Your message is saved.")}
      ${body("One day, " + pronoun(params.recipientName, "contraction") + " read this.")}
      ${preview}
      ${muted("You can still edit it before it&rsquo;s sealed.")}
      ${cta(params.editUrl, "Edit your message")}
    `),
  });
}

// #11 — Contributor Rejected
export async function sendContributorRejected(params: {
  to: string;
  contributorName: string;
  capsuleTitle: string;
  editUrl: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: "Small update needed",
    html: wrap(`
      ${heading("Your message needs a quick update before it&rsquo;s approved.")}
      ${body("Take a moment to revise it.")}
      ${cta(params.editUrl, "Edit your message")}
    `),
  });
}

// #26 — Capsule Transfer Request (wedding hand-off)
//
// Sent to the bride/groom's chosen manager when the bride/groom
// transfers ownership of their wedding capsule. The accept link
// is single-use; clicking it (after sign-in/sign-up with this
// email) flips MemoryCapsule.organiserId to the recipient.
export async function sendCapsuleTransferRequest(params: {
  to: string;
  toFirstName: string;
  fromName: string;
  capsuleTitle: string;
  acceptUrl: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: `${params.fromName} wants you to manage their wedding capsule.`,
    html: wrap(`
      ${heading(`${escapeHtml(params.fromName)} is asking you to manage their wedding capsule.`)}
      ${body(`Hi ${escapeHtml(params.toFirstName)} &mdash; ${escapeHtml(params.fromName)} has set up <strong>${escapeHtml(params.capsuleTitle)}</strong> on untilThen and wants you to manage it through reveal day so they don&rsquo;t see any messages early.`)}
      ${body("If you accept, you take over the capsule. You&rsquo;ll be able to see contributions as they come in, share the QR with guests, and seal the capsule before the reveal. The original purchaser will no longer be able to manage it.")}
      ${cta(params.acceptUrl, "Accept &amp; manage")}
      ${muted("This invite is unique to you. If you didn&rsquo;t expect it, just ignore the email &mdash; nothing happens until you click the link.")}
    `),
  });
}
