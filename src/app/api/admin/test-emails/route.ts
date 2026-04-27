import { NextResponse, type NextRequest } from "next/server";

import { logAdminAction } from "@/lib/admin-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = req.cookies.get("admin_auth")?.value;
  if (!process.env.ADMIN_PASSWORD || auth !== process.env.ADMIN_PASSWORD)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { to?: string; only?: string[] };
  const to = typeof body.to === "string" ? body.to.trim() : "";
  if (!to) return NextResponse.json({ error: "Missing 'to' email." }, { status: 400 });
  const only = Array.isArray(body.only) ? new Set(body.only) : null;

  await logAdminAction(req, "email.test-send", undefined, {
    to,
    only: only ? [...only] : "all",
  });

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://untilthenapp.io";
  const results: { name: string; ok: boolean; error?: string }[] = [];

  async function fire(id: string, name: string, fn: () => Promise<void>) {
    if (only && !only.has(id)) return;
    try {
      await fn();
      results.push({ name, ok: true });
    } catch (err) {
      results.push({ name, ok: false, error: (err as Error).message });
    }
  }

  const {
    sendCapsuleInvite,
    sendCapsuleDraftSaved,
    sendCapsuleDraftExpiring,
    sendCapsuleActivated,
    sendCapsuleContributionSubmitted,
    sendCapsuleContributorReminder,
    sendCapsuleRevealDay,
    sendCapsuleNewLink,
    sendCapsuleSaved,
    sendContributorConfirmation,
    sendContributorApproved,
    sendContributorRejected,
  } = await import("@/lib/capsule-emails");

  const {
    sendAccountDeleted,
    sendTrusteeNominated,
    sendWritingReminder,
    sendRevealCountdown,
    sendAccountRecoveryRequest,
    sendAccountRecoveryConfirmation,
    sendPinReset,
    sendCronHealthAlert,
    sendOrgInviteNew,
    sendOrgInviteExisting,
    sendOrgCapsuleTransferred,
    sendWeddingEditLink,
  } = await import("@/lib/emails");

  // #1 — Invite Contributor
  await fire("capsule-invite", "#1 Invite Contributor", () =>
    sendCapsuleInvite({
      to,
      contributorName: "Sarah",
      organiserName: "Jett",
      title: "Mom's 60th Birthday",
      recipientName: "Margaret Smith",
      revealDate: new Date(Date.now() + 30 * 86400000),
      inviteToken: "test-token-123",
    }),
  );

  // #2 — Draft Saved
  await fire("draft-saved", "#2 Draft Saved", () =>
    sendCapsuleDraftSaved({
      to,
      organiserName: "Jett",
      title: "Mom's 60th Birthday",
      dashboardUrl: `${origin}/capsules/test-id`,
    }),
  );

  // #3 — Draft Expiring
  await fire("draft-expiring", "#3 Draft Expiring", () =>
    sendCapsuleDraftExpiring({
      to,
      title: "Mom's 60th Birthday",
      dashboardUrl: `${origin}/capsules/test-id`,
    }),
  );

  // #4 — Capsule Activated
  await fire("capsule-activated", "#4 Capsule Activated", () =>
    sendCapsuleActivated({
      to,
      title: "Mom's 60th Birthday",
      recipientName: "Margaret Smith",
      revealDate: new Date(Date.now() + 30 * 86400000),
      contributorCount: 5,
      dashboardUrl: `${origin}/capsules/test-id`,
    }),
  );

  // #5 — Contribution Submitted
  await fire("contribution-submitted", "#5 Contribution Submitted", () =>
    sendCapsuleContributionSubmitted({
      to,
      contributorName: "Sarah",
      title: "Mom's 60th Birthday",
      dashboardUrl: `${origin}/capsules/test-id`,
    }),
  );

  // #6 — Contributor Reminder
  await fire("contributor-reminder", "#6 Contributor Reminder", () =>
    sendCapsuleContributorReminder({
      to,
      contributorName: "Sarah",
      title: "Mom's 60th Birthday",
      recipientName: "Margaret Smith",
      inviteToken: "test-token-123",
    }),
  );

  // #7 — Reveal Day
  await fire("reveal-day", "#7 Reveal Day", () =>
    sendCapsuleRevealDay({
      to,
      recipientName: "Margaret",
      title: "Mom's 60th Birthday",
      capsuleId: "test-id",
      accessToken: "test-access-token",
    }),
  );

  // #8 — New Link
  await fire("new-link", "#8 New Link", () =>
    sendCapsuleNewLink({
      to,
      recipientName: "Margaret",
      title: "Mom's 60th Birthday",
      capsuleId: "test-id",
      accessToken: "test-access-token",
    }),
  );

  // #9 — Capsule Saved
  await fire("capsule-saved", "#9 Capsule Saved", () =>
    sendCapsuleSaved({
      to,
      recipientName: "Margaret",
      title: "Mom's 60th Birthday",
    }),
  );

  // #10 — Contributor Confirmation
  await fire("contributor-confirmation", "#10 Contributor Confirmation", () =>
    sendContributorConfirmation({
      to,
      contributorName: "Sarah",
      recipientName: "Margaret Smith",
      capsuleTitle: "Mom's 60th Birthday",
      messagePreview: "You are the strongest woman I know. Every time I think about who I want to be, I think of you. I hope this birthday is everything you deserve.",
      editUrl: `${origin}/contribute/capsule/test-token-123`,
    }),
  );

  // #11 — Contributor Approved
  await fire("contributor-approved", "#11 Contributor Approved", () =>
    sendContributorApproved({
      to,
      contributorName: "Sarah",
      recipientName: "Margaret Smith",
      capsuleTitle: "Mom's 60th Birthday",
      editUrl: `${origin}/contribute/capsule/test-token-123`,
    }),
  );

  // #12 — Contributor Rejected
  await fire("contributor-rejected", "#12 Contributor Rejected", () =>
    sendContributorRejected({
      to,
      contributorName: "Sarah",
      capsuleTitle: "Mom's 60th Birthday",
      editUrl: `${origin}/contribute/capsule/test-token-123`,
    }),
  );


  // #17 — Account Deleted
  await fire("account-deleted", "#17 Account Deleted", () =>
    sendAccountDeleted({ to, firstName: "Jett" }),
  );

  // #17b — Trustee Nominated
  await fire("trustee-nominated", "#17b Trustee Nominated", () =>
    sendTrusteeNominated({
      to,
      trusteeName: "Sam",
      parentName: "Jett",
      childName: "Olivia",
    }),
  );

  // #18 — Writing Reminder
  await fire("writing-reminder", "#18 Writing Reminder", () =>
    sendWritingReminder({ to, parentName: "Jett", childName: "Olivia" }),
  );

  // #19a — Countdown 30 days
  await fire("countdown-30", "#19a Countdown 30 days", () =>
    sendRevealCountdown({
      to,
      parentName: "Jett",
      childName: "Olivia",
      daysLeft: 30,
      revealDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    }),
  );

  // #19b — Countdown 7 days
  await fire("countdown-7", "#19b Countdown 7 days", () =>
    sendRevealCountdown({
      to,
      parentName: "Jett",
      childName: "Olivia",
      daysLeft: 7,
      revealDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    }),
  );

  // #19c — Countdown 1 day
  await fire("countdown-1", "#19c Countdown 1 day", () =>
    sendRevealCountdown({
      to,
      parentName: "Jett",
      childName: "Olivia",
      daysLeft: 1,
      revealDate: new Date(Date.now() + 86400000).toISOString(),
    }),
  );

  // #1 Couple variant
  await fire("couple-invite", "#1 Invite (Couple)", () =>
    sendCapsuleInvite({
      to,
      contributorName: "Sarah",
      organiserName: "Jett",
      title: "Mom & Dad's 50th Anniversary",
      recipientName: "Margaret Smith & Robert Smith",
      revealDate: new Date(Date.now() + 30 * 86400000),
      inviteToken: "test-token-couple",
    }),
  );

  // #20a — Recovery request (fires to the support inbox, NOT `to`).
  // Included so admins can preview what the internal email looks
  // like without waiting for a real user to submit the form.
  await fire("recovery-support", "#20a Recovery → Support", () =>
    sendAccountRecoveryRequest({
      originalEmail: "jett@example.com",
      newEmail: to,
      fullName: "Jett Smith",
      childFirstName: "Olivia",
      approximateSignupDate: "Spring 2026",
      details:
        "Billing card ends in 4242. My co-parent Sarah is on the Sibling vault. Reveal date is Olivia's 18th birthday, June 2044.",
      ipAddress: "203.0.113.42",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15",
    }),
  );

  // #20b — Recovery confirmation (to the new email the requester gave us).
  await fire("recovery-confirmation", "#20b Recovery → Requester", () =>
    sendAccountRecoveryConfirmation({
      to,
      fullName: "Jett Smith",
    }),
  );

  // #21 — Vault PIN reset. Uses a fake token so the preview link
  // won't actually validate — that's fine, this is admin QA.
  await fire("pin-reset", "#21 Vault PIN Reset", () =>
    sendPinReset({
      to,
      firstName: "Jett",
      resetUrl: `${origin}/account/pin/reset?token=test-token-preview-abc123`,
    }),
  );

  // #22 — Cron health alert preview.
  await fire("cron-health-alert", "#22 Cron Health Alert", () =>
    sendCronHealthAlert({
      to,
      cronName: "reveal",
      intervalSec: 15 * 60,
      staleThresholdSec: 30 * 60,
      lastRunAt: new Date(Date.now() - 45 * 60 * 1000),
      ageSec: 45 * 60,
    }),
  );

  // #23 — Org invite (new user).
  await fire("org-invite-new", "#23 Org Invite (new user)", () =>
    sendOrgInviteNew({
      to,
      organizationName: "Acme Co.",
      inviterName: "Jett",
      acceptUrl: "https://untilthenapp.io/business?invite=sample-token",
    }),
  );

  // #24 — Org invite (existing user).
  await fire("org-invite-existing", "#24 Org Invite (existing user)", () =>
    sendOrgInviteExisting({
      to,
      organizationName: "Acme Co.",
      inviterName: "Jett",
      dashboardUrl: "https://untilthenapp.io/business",
    }),
  );

  // #25 — Org capsule transferred.
  await fire("org-capsule-transferred", "#25 Org Capsule Transferred", () =>
    sendOrgCapsuleTransferred({
      to,
      newOrganiserName: "Sarah",
      capsuleTitle: "Margaret's 60th Birthday",
      organizationName: "Acme Co.",
      capsuleUrl: "https://untilthenapp.io/capsules/sample-capsule",
    }),
  );

  // #26 — Wedding edit-link (guest opt-in to "edit later").
  await fire("wedding-edit-link", "#26 Wedding Edit Link", () =>
    sendWeddingEditLink({
      to,
      authorName: "Avery",
      coupleNames: "Alex & Jordan",
      editUrl:
        "https://untilthenapp.io/wedding/sample-guest-token?edit=sample-edit-token",
    }),
  );

  const sent = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  return NextResponse.json({
    to,
    total: results.length,
    sent,
    failed,
    results,
  });
}
