import { redirect } from "next/navigation";

import { effectiveStatus } from "@/lib/capsules";

import { CapsuleContributeForm } from "./CapsuleContributeForm";

export const metadata = {
  title: "Contribute to a Gift Capsule — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function CapsuleContributePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const { prisma } = await import("@/lib/prisma");
  const invite = await prisma.capsuleInvite.findUnique({
    where: { inviteToken: token },
    include: {
      capsule: {
        select: {
          id: true,
          title: true,
          recipientName: true,
          occasionType: true,
          status: true,
          revealDate: true,
          contributorDeadline: true,
          firstOpenedAt: true,
          contributionsClosed: true,
        },
      },
    },
  });

  if (!invite) {
    return (
      <ClosedScreen
        headline="This link doesn't look right."
        sub="It might have been mistyped or the capsule was removed."
      />
    );
  }

  const c = invite.capsule;
  if (c.status === "DRAFT") {
    return (
      <ClosedScreen
        headline="The organiser hasn't activated this capsule yet."
        sub="Check back once they do."
      />
    );
  }
  const status = effectiveStatus(c);
  if (status === "SEALED") {
    // Distinguish manual seal (contributionsClosed true) from
    // deadline-passed so the organiser-locked path can point the
    // contributor at the organiser instead of just saying "the
    // deadline passed."
    if (c.contributionsClosed) {
      return (
        <ClosedScreen
          headline="This capsule is locked."
          sub="The organiser sealed it before the deadline. Reach out to them if you need to add to it."
        />
      );
    }
    return (
      <ClosedScreen
        headline="Contributions are closed."
        sub={`The deadline for ${c.title} has passed.`}
      />
    );
  }
  if (status === "SENT") {
    return (
      <ClosedScreen
        headline={`${c.recipientName}'s capsule has been sent.`}
        sub="Contributions are locked once a capsule reaches its reveal date."
      />
    );
  }
  if (status === "REVEALED") {
    return (
      <ClosedScreen
        headline={`${c.recipientName} has already opened their capsule.`}
        sub="Thanks for thinking of them."
      />
    );
  }

  // Returning contributor — load existing contribution for editing
  let existingContribution: { id: string; title: string | null; body: string | null } | null = null;
  if (invite.status === "ACTIVE") {
    const contrib = await prisma.capsuleContribution.findFirst({
      where: {
        capsuleId: c.id,
        OR: [
          { authorEmail: invite.email },
          { authorName: invite.name ?? undefined },
        ],
        createdAt: invite.acceptedAt ? { gte: invite.acceptedAt } : undefined,
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, body: true },
    });
    existingContribution = contrib;
  }

  return (
    <CapsuleContributeForm
      token={token}
      existingContribution={existingContribution}
      capsule={{
        title: c.title,
        recipientName: c.recipientName,
        occasionType: c.occasionType,
        revealDate: c.revealDate.toISOString(),
        contributorDeadline: c.contributorDeadline?.toISOString() ?? null,
      }}
      invite={{ name: invite.name ?? "" }}
    />
  );
}

function ClosedScreen({
  headline,
  sub,
}: {
  headline: string;
  sub: string;
}) {
  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="max-w-[420px] text-center">
        <h1 className="text-[26px] font-extrabold text-navy tracking-[-0.4px] leading-tight">
          {headline}
        </h1>
        <p className="mt-3 text-sm text-ink-mid leading-[1.6]">{sub}</p>
      </div>
    </main>
  );
}
