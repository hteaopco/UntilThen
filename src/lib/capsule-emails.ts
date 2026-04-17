// Resend email helpers for Gift Capsules. Best-effort — failed
// sends log and move on, never fail the parent request.

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

async function send(opts: {
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
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
  } catch (err) {
    console.error("[capsule-emails] send failed:", err);
  }
}

function formatLong(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ── Contributor invite ─────────────────────────────────────
export async function sendCapsuleInvite(params: {
  to: string;
  contributorName: string | null;
  organiserName: string;
  title: string;
  recipientName: string;
  revealDate: Date;
  inviteToken: string;
}): Promise<void> {
  const url = `${baseUrl()}/contribute/capsule/${params.inviteToken}`;
  const hello = params.contributorName
    ? `Hi ${escapeHtml(params.contributorName)},`
    : "Hello,";
  await send({
    to: params.to,
    subject: `You're invited to contribute to ${params.title}`,
    html: wrap(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">
        You&rsquo;re invited to contribute to ${escapeHtml(params.title)}.
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 12px;">
        ${hello}
      </p>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 12px;">
        ${escapeHtml(params.organiserName)} is putting together a Memory
        Capsule for ${escapeHtml(params.recipientName)}. It opens on
        ${escapeHtml(formatLong(params.revealDate))}.
      </p>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 20px;">
        Add your message, a photo, or a voice note — it takes a minute.
        ${escapeHtml(params.recipientName)} won&rsquo;t see anything
        until the day.
      </p>
      <p style="margin:24px 0;">
        <a href="${url}" style="display:inline-block;background:#0f1f3d;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Add my contribution</a>
      </p>
    `),
  });
}

// ── Draft saved (free; before payment) ─────────────────────
export async function sendCapsuleDraftSaved(params: {
  to: string;
  organiserName: string;
  title: string;
  dashboardUrl: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: `Your Gift Capsule is saved — complete setup to send invites`,
    html: wrap(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">
        Your Gift Capsule is saved.
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 20px;">
        ${escapeHtml(params.title)} is waiting. Add contributors and
        activate it to start collecting memories.
      </p>
      <p style="margin:24px 0;">
        <a href="${params.dashboardUrl}" style="display:inline-block;background:#0f1f3d;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Continue setup</a>
      </p>
    `),
  });
}

// ── Draft expiry warning (day 6 / before auto-delete) ──────
export async function sendCapsuleDraftExpiring(params: {
  to: string;
  title: string;
  dashboardUrl: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: `Your Gift Capsule draft expires tomorrow`,
    html: wrap(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">
        Tomorrow&rsquo;s the last day to finish ${escapeHtml(params.title)}.
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 20px;">
        Draft capsules are cleared after seven days. Activate this
        one to keep it.
      </p>
      <p style="margin:24px 0;">
        <a href="${params.dashboardUrl}" style="display:inline-block;background:#0f1f3d;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Finish setup</a>
      </p>
    `),
  });
}

// ── Capsule activated (payment settled; invites sent) ──────
export async function sendCapsuleActivated(params: {
  to: string;
  title: string;
  recipientName: string;
  revealDate: Date;
  contributorCount: number;
  dashboardUrl: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: `Your Gift Capsule is live — invites sent`,
    html: wrap(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">
        Your Gift Capsule is live.
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 12px;">
        ${params.contributorCount} ${params.contributorCount === 1 ? "invite" : "invites"}
        just went out for ${escapeHtml(params.title)}.
        ${escapeHtml(params.recipientName)} will open it on
        ${escapeHtml(formatLong(params.revealDate))}.
      </p>
      <p style="margin:24px 0;">
        <a href="${params.dashboardUrl}" style="display:inline-block;background:#0f1f3d;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Open your capsule</a>
      </p>
    `),
  });
}

// ── Contribution submitted (organiser notified) ────────────
export async function sendCapsuleContributionSubmitted(params: {
  to: string;
  contributorName: string;
  title: string;
  dashboardUrl: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: `${params.contributorName} added something to ${params.title}`,
    html: wrap(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">
        ${escapeHtml(params.contributorName)} just contributed.
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 20px;">
        Their message is in ${escapeHtml(params.title)}.
      </p>
      <p style="margin:24px 0;">
        <a href="${params.dashboardUrl}" style="display:inline-block;background:#0f1f3d;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">View capsule</a>
      </p>
    `),
  });
}

// ── Contributor deadline reminder (48hrs) ──────────────────
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
    subject: `Last chance to contribute to ${params.title}`,
    html: wrap(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">
        Last chance to add to ${escapeHtml(params.title)}.
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 20px;">
        Contributions close soon. ${escapeHtml(params.recipientName)}
        won&rsquo;t see anything unless you finish now.
      </p>
      <p style="margin:24px 0;">
        <a href="${url}" style="display:inline-block;background:#0f1f3d;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Add my contribution</a>
      </p>
    `),
  });
}

// ── Reveal day (recipient notified) ────────────────────────
export async function sendCapsuleRevealDay(params: {
  to: string;
  recipientName: string;
  title: string;
  capsuleId: string;
  accessToken: string;
}): Promise<void> {
  const url = `${baseUrl()}/capsule/${params.capsuleId}/open?t=${params.accessToken}`;
  await send({
    to: params.to,
    subject: `Your Gift Capsule is ready, ${params.recipientName}`,
    html: wrap(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">
        Hi ${escapeHtml(params.recipientName)},
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 20px;">
        The people who love you have been writing to you.
        Today&rsquo;s the day.
      </p>
      <p style="margin:24px 0;">
        <a href="${url}" style="display:inline-block;background:#0f1f3d;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Open my capsule</a>
      </p>
      <p style="font-size:13px;color:#8896a5;line-height:1.6;margin:16px 0 0;font-style:italic;">
        This link is just for you.
      </p>
    `),
  });
}

// ── Fresh magic link ───────────────────────────────────────
export async function sendCapsuleNewLink(params: {
  to: string;
  recipientName: string;
  title: string;
  capsuleId: string;
  accessToken: string;
}): Promise<void> {
  const url = `${baseUrl()}/capsule/${params.capsuleId}/open?t=${params.accessToken}`;
  await send({
    to: params.to,
    subject: `Here's your new link to ${params.title}`,
    html: wrap(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">
        A fresh link for ${escapeHtml(params.recipientName)}.
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 20px;">
        Click to open ${escapeHtml(params.title)}.
      </p>
      <p style="margin:24px 0;">
        <a href="${url}" style="display:inline-block;background:#0f1f3d;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">Open my capsule</a>
      </p>
    `),
  });
}

// ── Recipient saved capsule (organiser notified) ───────────
export async function sendCapsuleSaved(params: {
  to: string;
  recipientName: string;
  title: string;
}): Promise<void> {
  await send({
    to: params.to,
    subject: `${params.recipientName} saved their capsule`,
    html: wrap(`
      <h1 style="font-size:24px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">
        ${escapeHtml(params.recipientName)} saved ${escapeHtml(params.title)}.
      </h1>
      <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 20px;">
        They created an account so they can revisit it any time.
      </p>
    `),
  });
}

export async function sendContributorConfirmation(params: {
  to: string;
  contributorName: string;
  recipientName: string;
  capsuleTitle: string;
  messagePreview: string | null;
  editUrl: string;
}): Promise<void> {
  const preview = params.messagePreview
    ? `<div style="margin:16px 0;padding:16px;background:#fdf8f2;border-radius:12px;border:1px solid rgba(196,122,58,0.15);">
        <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.1em;font-weight:700;color:#8896a5;margin:0 0 8px;">Your message</p>
        <p style="font-size:14px;color:#0f1f3d;line-height:1.6;margin:0;">${escapeHtml(params.messagePreview.slice(0, 500))}</p>
      </div>`
    : "";
  const html = wrap(`
    <h1 style="font-size:24px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">
      Your contribution is saved, ${escapeHtml(params.contributorName)}.
    </h1>
    <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 8px;">
      You added something to <strong>${escapeHtml(params.capsuleTitle)}</strong> for ${escapeHtml(params.recipientName)}.
    </p>
    ${preview}
    <p style="font-size:14px;color:#8896a5;line-height:1.6;margin:16px 0;">
      Want to make changes? You can edit your contribution before the reveal date.
    </p>
    <a href="${params.editUrl}" style="display:inline-block;background:#c47a3a;color:#ffffff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
      Edit my contribution
    </a>
  `);
  await send({
    to: params.to,
    subject: `Your contribution to "${params.capsuleTitle}" is saved`,
    html,
  });
}

export async function sendContributorApproved(params: {
  to: string;
  contributorName: string;
  recipientName: string;
  capsuleTitle: string;
  editUrl: string;
}): Promise<void> {
  const html = wrap(`
    <h1 style="font-size:24px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">
      Your contribution has been approved!
    </h1>
    <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 8px;">
      Great news, ${escapeHtml(params.contributorName)} &mdash; your message for <strong>${escapeHtml(params.capsuleTitle)}</strong> has been approved by the organiser.
    </p>
    <p style="font-size:14px;color:#8896a5;line-height:1.6;margin:0 0 20px;">
      ${escapeHtml(params.recipientName)} will see it on the reveal date. You can still make edits before then.
    </p>
    <a href="${params.editUrl}" style="display:inline-block;background:#c47a3a;color:#ffffff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
      View or edit my contribution
    </a>
  `);
  await send({
    to: params.to,
    subject: `Approved: your contribution to "${params.capsuleTitle}"`,
    html,
  });
}

export async function sendContributorRejected(params: {
  to: string;
  contributorName: string;
  capsuleTitle: string;
  editUrl: string;
}): Promise<void> {
  const html = wrap(`
    <h1 style="font-size:24px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">
      Your contribution needs a revision.
    </h1>
    <p style="font-size:16px;color:#4a5568;line-height:1.7;margin:0 0 8px;">
      Hi ${escapeHtml(params.contributorName)} &mdash; the organiser of <strong>${escapeHtml(params.capsuleTitle)}</strong> has requested changes to your message.
    </p>
    <p style="font-size:14px;color:#8896a5;line-height:1.6;margin:0 0 20px;">
      No worries &mdash; you can edit your contribution or start fresh using the link below.
    </p>
    <a href="${params.editUrl}" style="display:inline-block;background:#c47a3a;color:#ffffff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:8px;text-decoration:none;">
      Edit my contribution
    </a>
  `);
  await send({
    to: params.to,
    subject: `Changes requested: your contribution to "${params.capsuleTitle}"`,
    html,
  });
}
