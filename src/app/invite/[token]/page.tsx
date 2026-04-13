import Link from "next/link";

import { LogoSvg } from "@/components/ui/LogoSvg";
import { InviteAccept } from "./InviteAccept";

export const metadata = {
  title: "You've been invited — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  if (!process.env.DATABASE_URL) {
    return (
      <Shell>
        <p className="text-ink-mid">Database not reachable. Please try later.</p>
      </Shell>
    );
  }

  const { prisma } = await import("@/lib/prisma");
  const contributor = await prisma.contributor.findUnique({
    where: { inviteToken: token },
    include: {
      vault: {
        include: { child: { include: { parent: true } } },
      },
    },
  });

  if (!contributor || contributor.status === "REVOKED") {
    return (
      <Shell>
        <h1 className="text-2xl font-extrabold text-navy mb-2">
          Invite not found
        </h1>
        <p className="text-ink-mid">
          This invitation is no longer valid. Ask for a fresh link.
        </p>
      </Shell>
    );
  }

  const revealLabel = contributor.vault.revealDate
    ? contributor.vault.revealDate.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "the reveal date";

  return (
    <Shell>
      <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-3">
        You&rsquo;ve been invited
      </p>
      <h1 className="text-[32px] lg:text-[40px] font-extrabold text-navy tracking-[-0.8px] leading-[1.1] mb-4">
        Help write to {contributor.vault.child.firstName}.
      </h1>
      <p className="text-base text-ink-mid leading-[1.7] mb-8">
        <span className="font-semibold text-navy">
          {contributor.vault.child.parent.firstName}
        </span>{" "}
        has invited you to contribute to {contributor.vault.child.firstName}
        &rsquo;s vault — a private collection of letters, photos, voice notes,
        and videos {contributor.vault.child.firstName} will open on{" "}
        <span className="font-semibold text-navy">{revealLabel}</span>.
      </p>

      <InviteAccept
        token={token}
        alreadyAccepted={contributor.status === "ACTIVE"}
        vaultId={contributor.vault.id}
      />
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-[520px]">
        <Link
          href="/"
          aria-label="untilThen home"
          className="inline-flex items-center mb-10"
        >
          <LogoSvg variant="dark" width={140} height={28} />
        </Link>
        {children}
      </div>
    </main>
  );
}
