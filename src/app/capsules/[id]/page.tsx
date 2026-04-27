import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import type { Attachment } from "@/components/editor/MediaAttachments";
import { Footer } from "@/components/landing/Footer";
import { TopNav } from "@/components/ui/TopNav";
import { effectiveStatus, findOwnedCapsule } from "@/lib/capsules";
import { userHasGiftAccess } from "@/lib/paywall";
import { r2IsConfigured, signGetUrl, type MediaKind } from "@/lib/r2";

import { CapsuleOverview } from "./CapsuleOverview";

export const metadata = {
  title: "Gift Capsule — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function CapsulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const owned = await findOwnedCapsule(userId, id);
  if (!owned.ok) redirect("/dashboard");

  // Resolve paywall state once here + thread to the client. The
  // activation modal uses this to decide whether to show the
  // card-entry step or let the organiser skip straight through.
  // Org-attributed capsules (enterprise) always skip payment
  // because the organisation is the buyer, not the user.
  const giftAccessFree = await userHasGiftAccess(owned.user.id);

  const { prisma } = await import("@/lib/prisma");
  const capsule = await prisma.memoryCapsule.findUnique({
    where: { id },
    include: {
      contributions: {
        // Hide both SCANNING (async scan in flight) and FLAGGED
        // (held for admin review) from the organiser's capsule
        // detail page. Items reappear once Hive resolves to
        // PASS / FAILED_OPEN or an admin clears a flag.
        where: { moderationState: { notIn: ["FLAGGED", "SCANNING"] } },
        orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
      },
      invites: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!capsule) redirect("/dashboard");

  const status = effectiveStatus(capsule);
  // Org-attributed capsules are paid for by the organisation
  // (loss-leader B2B channel) — the user never sees a Square
  // checkout. Same gate is mirrored in /api/.../activate.
  const isOrgAttributed = Boolean(capsule.organizationId);
  const requiresPayment = !giftAccessFree && !isOrgAttributed;

  // Wedding bride/groom hand-off: when the organiser opted to
  // hide messages until reveal day, scrub every contribution
  // body, title, author, and media count server-side before the
  // payload leaves the request. Only the total count survives.
  // Auto-expires the moment revealDate passes — no cron needed.
  const redactContributions =
    capsule.hideUntilReveal && capsule.revealDate.getTime() > Date.now();

  // Hydrate the organiser's own contribution attachments with
  // signed GET urls so MediaAttachments can render thumbnails
  // for what's already saved.
  const ownContribution = capsule.contributions.find(
    (c) => c.clerkUserId === userId,
  );
  let ownAttachments: Attachment[] = [];
  if (ownContribution && r2IsConfigured() && ownContribution.mediaUrls.length) {
    ownAttachments = await Promise.all(
      ownContribution.mediaUrls.map(async (key, i): Promise<Attachment> => {
        const kind = (ownContribution.mediaTypes[i] ?? "photo") as MediaKind;
        const viewUrl = await signGetUrl(key);
        const name = key.split("/").pop() ?? "attachment";
        return { key, kind, viewUrl, name };
      }),
    );
  }

  // Batch-resolve avatar keys for every contribution author who's a
  // signed-in user, then sign GET URLs in parallel. Anonymous /
  // photo-less authors fall back to amber initials in the UI.
  const contributorClerkIds = Array.from(
    new Set(
      capsule.contributions
        .map((c) => c.clerkUserId)
        .filter((v): v is string => !!v),
    ),
  );
  const avatarUrlByClerkId = new Map<string, string>();
  if (contributorClerkIds.length > 0 && r2IsConfigured()) {
    const authors = await prisma.user.findMany({
      where: { clerkId: { in: contributorClerkIds } },
      select: { clerkId: true, avatarUrl: true },
    });
    await Promise.all(
      authors
        .filter((a) => a.avatarUrl)
        .map(async (a) => {
          try {
            const url = await signGetUrl(a.avatarUrl!);
            avatarUrlByClerkId.set(a.clerkId, url);
          } catch {
            /* skip — initials fallback */
          }
        }),
    );
  }

  // Avatar lookup for invitees who've signed up. Matches
  // CapsuleInvite.email → User.email (populated for new sign-ups
  // by /api/onboarding and backfilled for existing users via
  // ensureUserEmail). Same R2-signing dance as the contribution
  // author lookup above; misses fall through to initials.
  const inviteEmails = Array.from(
    new Set(capsule.invites.map((i) => i.email.toLowerCase())),
  );
  const inviteAvatarByEmail = new Map<string, string>();
  if (inviteEmails.length > 0 && r2IsConfigured()) {
    const inviteUsers = await prisma.user.findMany({
      where: { email: { in: inviteEmails } },
      select: { email: true, avatarUrl: true },
    });
    await Promise.all(
      inviteUsers
        .filter((u) => u.email && u.avatarUrl)
        .map(async (u) => {
          try {
            const url = await signGetUrl(u.avatarUrl!);
            inviteAvatarByEmail.set(u.email!, url);
          } catch {
            /* skip — initials fallback */
          }
        }),
    );
  }

  return (
    <>
      <TopNav />
      <CapsuleOverview
        capsule={{
        id: capsule.id,
        title: capsule.title,
        recipientName: capsule.recipientName,
        recipientPronoun: capsule.recipientPronoun,
        recipientEmail: capsule.recipientEmail,
        recipientPhone: capsule.recipientPhone,
        occasionType: capsule.occasionType,
        tone: capsule.tone,
        revealDate: capsule.revealDate.toISOString(),
        contributorDeadline:
          capsule.contributorDeadline?.toISOString() ?? null,
        status,
        rawStatus: capsule.status,
        isPaid: capsule.isPaid,
        requiresApproval: capsule.requiresApproval,
        contributionsClosed: capsule.contributionsClosed,
        accessToken: capsule.accessToken,
        guestToken: capsule.guestToken,
        hideUntilReveal: capsule.hideUntilReveal,
        organizationId: capsule.organizationId,
      }}
      currentUserClerkId={userId}
      requiresPayment={requiresPayment}
      isOrgAttributed={isOrgAttributed}
      redactContributions={redactContributions}
      contributionCount={capsule.contributions.length}
      contributions={
        redactContributions
          ? []
          : capsule.contributions.map((c) => ({
              id: c.id,
              authorName: c.authorName,
              authorAvatarUrl: c.clerkUserId
                ? avatarUrlByClerkId.get(c.clerkUserId) ?? null
                : null,
              clerkUserId: c.clerkUserId,
              type: c.type,
              title: c.title,
              body: c.body,
              attachmentCount: c.mediaUrls.length,
              approvalStatus: c.approvalStatus,
              createdAt: c.createdAt.toISOString(),
            }))
      }
      ownAttachments={ownAttachments}
      invites={capsule.invites.map((i) => ({
        id: i.id,
        email: i.email,
        name: i.name,
        status: i.status,
        requiresApproval: i.requiresApproval,
        inviteToken: i.inviteToken,
        avatarUrl: inviteAvatarByEmail.get(i.email.toLowerCase()) ?? null,
      }))}
    />
      <Footer />
    </>
  );
}
