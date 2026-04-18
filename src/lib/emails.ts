// Shared Resend email helpers. Each send is best-effort: if Resend is
// not configured or the send throws, we log and move on — we never
// want a failing email to break the primary request.

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

async function send({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("[emails] send failed:", err);
  }
}

function wrapper(body: string): string {
  return `<div style="font-family:'DM Sans',-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:40px 24px;color:#0f1f3d;">${body}</div>`;
}

function cta(href: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${href}" style="display:inline-block;background:#c47a3a;color:#ffffff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">${label}</a></p>`;
}

// #13 — Invite Accepted (→ Parent)
export async function sendInviteAccepted(params: {
  parentEmail: string;
  parentFirstName: string;
  contributorName: string;
  childFirstName: string;
  dashboardUrl?: string;
}): Promise<void> {
  const url = params.dashboardUrl ?? `${baseUrl()}/dashboard`;
  await send({
    to: params.parentEmail,
    subject: "Someone just joined you",
    html: wrapper(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 16px;letter-spacing:-0.5px;">
        ${escapeHtml(params.contributorName)} accepted your invite.
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 12px;">
        They&rsquo;re about to add something meaningful to ${escapeHtml(params.childFirstName)}&rsquo;s capsule.
      </p>
      ${cta(url, "View your capsule")}
    `),
  });
}

// #14 — Entry Needs Review
export async function sendEntryNeedsReview(params: {
  parentEmail: string;
  contributorName: string;
  childFirstName: string;
  entryTitle: string;
  dashboardUrl?: string;
}): Promise<void> {
  const url = params.dashboardUrl ?? `${baseUrl()}/dashboard`;
  await send({
    to: params.parentEmail,
    subject: "Something new is waiting",
    html: wrapper(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 16px;letter-spacing:-0.5px;">
        A new entry has been added.
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 12px;">
        Take a moment to review it before it&rsquo;s sealed.
      </p>
      ${cta(url, "Review entry")}
    `),
  });
}

// #15 — Entry Approved
export async function sendEntryApproved(params: {
  contributorEmail: string;
  contributorName: string;
  childFirstName: string;
  entryTitle: string;
  contributorDashboardUrl: string;
}): Promise<void> {
  await send({
    to: params.contributorEmail,
    subject: "It\u2019s been added",
    html: wrapper(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 16px;letter-spacing:-0.5px;">
        Your entry has been approved.
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 12px;">
        It&rsquo;s now part of what they&rsquo;ll open one day.
      </p>
      ${cta(params.contributorDashboardUrl, "View your message")}
    `),
  });
}

// #16 — Entry Rejected
export async function sendEntryRejected(params: {
  contributorEmail: string;
  contributorName: string;
  childFirstName: string;
  entryTitle: string;
  contributorDashboardUrl: string;
}): Promise<void> {
  await send({
    to: params.contributorEmail,
    subject: "Almost there",
    html: wrapper(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 16px;letter-spacing:-0.5px;">
        Your entry needs a quick update.
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 12px;">
        Make the change and resubmit.
      </p>
      ${cta(params.contributorDashboardUrl, "Edit entry")}
    `),
  });
}

// #17 — Account Deleted
export async function sendAccountDeleted(params: {
  to: string;
  firstName: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: "Your account has been deleted",
    html: wrapper(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 16px;letter-spacing:-0.5px;">
        Your account has been successfully deleted.
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 12px;">
        If you ever decide to return, we&rsquo;ll be here.
      </p>
      <p style="font-size:14px;color:#8896a5;line-height:1.6;margin:0;">
        If you didn&rsquo;t request this, contact us at hello@untilthenapp.io.
      </p>
    `),
  });
}

export async function sendTrusteeNominated(params: {
  to: string;
  trusteeName: string;
  parentName: string;
  childName: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: "Someone trusts you with something important.",
    html: wrapper(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 16px;letter-spacing:-0.5px;">
        ${escapeHtml(params.parentName)} named you as a trusted person.
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 12px;">
        If ${escapeHtml(params.parentName)} is ever unable to access their account, you may be contacted to help transfer ${escapeHtml(params.childName)}&rsquo;s time capsule.
      </p>
      <p style="font-size:14px;color:#8896a5;line-height:1.6;margin:0 0 12px;">
        You don&rsquo;t need to do anything right now. This is just to let you know.
      </p>
      <p style="font-size:14px;color:#8896a5;line-height:1.6;margin:0;">
        If you have questions, reply to this email.
      </p>
    `),
  });
}

// #18 — Writing Reminder (30+ Days)
export async function sendWritingReminder(params: {
  to: string;
  parentName: string;
  childName: string;
}): Promise<void> {
  const url = `${baseUrl()}/dashboard`;
  await send({
    to: params.to,
    subject: "Don\u2019t forget this version of them.",
    html: wrapper(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 16px;letter-spacing:-0.5px;">
        It&rsquo;s been a while since your last memory.
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 12px;">
        Take a minute to write something &mdash; even small moments matter.
      </p>
      ${cta(url, "Write a memory")}
    `),
  });
}

// #19 — Reveal Countdown
export async function sendRevealCountdown(params: {
  to: string;
  parentName: string;
  childName: string;
  daysLeft: number;
  revealDate: string;
}): Promise<void> {
  const url = `${baseUrl()}/dashboard`;
  const subject =
    params.daysLeft === 1 ? "Tomorrow changes everything"
    : params.daysLeft === 7 ? "One week to go"
    : "One month from now";
  await send({
    to: params.to,
    subject,
    html: wrapper(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 16px;letter-spacing:-0.5px;">
        ${params.daysLeft === 1
          ? "It&rsquo;s almost time."
          : params.daysLeft === 7
            ? "They&rsquo;re about to see it all."
            : "They&rsquo;ll open everything."}
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 12px;">
        ${escapeHtml(params.childName)}&rsquo;s capsule ${params.daysLeft === 1 ? "opens tomorrow" : `opens in ${params.daysLeft} days`}.
      </p>
      ${cta(url, "View your capsule")}
    `),
  });
}
