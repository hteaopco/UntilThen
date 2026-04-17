import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = req.cookies.get("admin_auth")?.value;
  if (!process.env.ADMIN_PASSWORD || auth !== process.env.ADMIN_PASSWORD)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { to?: string };
  const to = typeof body.to === "string" ? body.to.trim() : "";
  if (!to) return NextResponse.json({ error: "Missing 'to' email." }, { status: 400 });

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://untilthenapp.io";
  const results: { name: string; ok: boolean; error?: string }[] = [];

  async function fire(name: string, fn: () => Promise<void>) {
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
    sendInviteAccepted,
    sendEntryNeedsReview,
    sendEntryApproved,
    sendEntryRejected,
    sendAccountDeleted,
    sendWritingReminder,
    sendRevealCountdown,
  } = await import("@/lib/emails");

  // #1 — Invite Contributor
  await fire("#1 Invite Contributor", () =>
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
  await fire("#2 Draft Saved", () =>
    sendCapsuleDraftSaved({
      to,
      organiserName: "Jett",
      title: "Mom's 60th Birthday",
      dashboardUrl: `${origin}/capsules/test-id`,
    }),
  );

  // #3 — Draft Expiring
  await fire("#3 Draft Expiring", () =>
    sendCapsuleDraftExpiring({
      to,
      title: "Mom's 60th Birthday",
      dashboardUrl: `${origin}/capsules/test-id`,
    }),
  );

  // #4 — Capsule Activated
  await fire("#4 Capsule Activated", () =>
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
  await fire("#5 Contribution Submitted", () =>
    sendCapsuleContributionSubmitted({
      to,
      contributorName: "Sarah",
      title: "Mom's 60th Birthday",
      dashboardUrl: `${origin}/capsules/test-id`,
    }),
  );

  // #6 — Contributor Reminder
  await fire("#6 Contributor Reminder", () =>
    sendCapsuleContributorReminder({
      to,
      contributorName: "Sarah",
      title: "Mom's 60th Birthday",
      recipientName: "Margaret Smith",
      inviteToken: "test-token-123",
    }),
  );

  // #7 — Reveal Day
  await fire("#7 Reveal Day", () =>
    sendCapsuleRevealDay({
      to,
      recipientName: "Margaret",
      title: "Mom's 60th Birthday",
      capsuleId: "test-id",
      accessToken: "test-access-token",
    }),
  );

  // #8 — New Link
  await fire("#8 New Link", () =>
    sendCapsuleNewLink({
      to,
      recipientName: "Margaret",
      title: "Mom's 60th Birthday",
      capsuleId: "test-id",
      accessToken: "test-access-token",
    }),
  );

  // #9 — Capsule Saved
  await fire("#9 Capsule Saved", () =>
    sendCapsuleSaved({
      to,
      recipientName: "Margaret",
      title: "Mom's 60th Birthday",
    }),
  );

  // #10 — Contributor Confirmation
  await fire("#10 Contributor Confirmation", () =>
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
  await fire("#11 Contributor Approved", () =>
    sendContributorApproved({
      to,
      contributorName: "Sarah",
      recipientName: "Margaret Smith",
      capsuleTitle: "Mom's 60th Birthday",
      editUrl: `${origin}/contribute/capsule/test-token-123`,
    }),
  );

  // #12 — Contributor Rejected
  await fire("#12 Contributor Rejected", () =>
    sendContributorRejected({
      to,
      contributorName: "Sarah",
      capsuleTitle: "Mom's 60th Birthday",
      editUrl: `${origin}/contribute/capsule/test-token-123`,
    }),
  );

  // #13 — Invite Accepted
  await fire("#13 Invite Accepted", () =>
    sendInviteAccepted({
      parentEmail: to,
      parentFirstName: "Jett",
      contributorName: "Grandma Rose",
      childFirstName: "Olivia",
      dashboardUrl: `${origin}/dashboard`,
    }),
  );

  // #14 — Entry Needs Review
  await fire("#14 Entry Needs Review", () =>
    sendEntryNeedsReview({
      parentEmail: to,
      contributorName: "Grandma Rose",
      childFirstName: "Olivia",
      entryTitle: "The day you were born",
      dashboardUrl: `${origin}/dashboard`,
    }),
  );

  // #15 — Entry Approved
  await fire("#15 Entry Approved", () =>
    sendEntryApproved({
      contributorEmail: to,
      contributorName: "Grandma Rose",
      childFirstName: "Olivia",
      entryTitle: "The day you were born",
      contributorDashboardUrl: `${origin}/dashboard`,
    }),
  );

  // #16 — Entry Rejected
  await fire("#16 Entry Rejected", () =>
    sendEntryRejected({
      contributorEmail: to,
      contributorName: "Grandma Rose",
      childFirstName: "Olivia",
      entryTitle: "The day you were born",
      contributorDashboardUrl: `${origin}/dashboard`,
    }),
  );

  // #17 — Account Deleted
  await fire("#17 Account Deleted", () =>
    sendAccountDeleted({ to, firstName: "Jett" }),
  );

  // #18 — Writing Reminder
  await fire("#18 Writing Reminder", () =>
    sendWritingReminder({ to, parentName: "Jett", childName: "Olivia" }),
  );

  // #19a — Countdown 30 days
  await fire("#19a Countdown 30 days", () =>
    sendRevealCountdown({
      to,
      parentName: "Jett",
      childName: "Olivia",
      daysLeft: 30,
      revealDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    }),
  );

  // #19b — Countdown 7 days
  await fire("#19b Countdown 7 days", () =>
    sendRevealCountdown({
      to,
      parentName: "Jett",
      childName: "Olivia",
      daysLeft: 7,
      revealDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    }),
  );

  // #19c — Countdown 1 day
  await fire("#19c Countdown 1 day", () =>
    sendRevealCountdown({
      to,
      parentName: "Jett",
      childName: "Olivia",
      daysLeft: 1,
      revealDate: new Date(Date.now() + 86400000).toISOString(),
    }),
  );

  // #1 Couple variant
  await fire("#1 Invite (Couple)", () =>
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
