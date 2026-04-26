import { auth } from "@clerk/nextjs/server";
import Link from "next/link";

import { Footer } from "@/components/landing/Footer";
import { LogoSvg } from "@/components/ui/LogoSvg";
import { prisma } from "@/lib/prisma";

import { AcceptInviteClient } from "./AcceptInviteClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Join your team — untilThen",
};

/**
 * Public landing for an org invite magic link. Unauthenticated
 * visitors see a "Sign up to claim" pitch with a sign-up CTA
 * that returns here after auth. Authenticated visitors see the
 * "Claim your seat" button which calls the accept API.
 *
 * The accept API handles the personal-vs-work-email case via
 * Clerk's multi-email feature — see
 * /api/orgs/invites/[token]/accept for the full flow.
 */
export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { userId } = auth();

  const invite = await prisma.organizationInvite.findUnique({
    where: { inviteToken: token },
    include: { organization: { select: { name: true } } },
  });

  if (!invite) {
    return <ErrorShell heading="This invite link isn't valid." />;
  }
  if (invite.status !== "PENDING") {
    return (
      <ErrorShell
        heading={
          invite.status === "ACCEPTED"
            ? "This invite has already been claimed."
            : "This invite is no longer active."
        }
      />
    );
  }

  return (
    <>
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 py-12">
        <Link
          href="/"
          aria-label="untilThen home"
          className="mb-10 inline-flex items-center"
        >
          <LogoSvg variant="dark" width={140} height={28} />
        </Link>

        <div className="w-full max-w-[480px] rounded-2xl border border-amber/25 bg-white px-6 py-8 sm:px-8 sm:py-10 text-center">
          <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-2">
            Enterprise invite
          </p>
          <h1 className="text-[26px] sm:text-[30px] font-extrabold text-navy tracking-[-0.4px] leading-[1.2] mb-3">
            {invite.organization.name} invited you to untilThen.
          </h1>
          <p className="text-[14px] text-ink-mid leading-[1.6] mb-6">
            Your company is covering untilThen as a benefit. Once you claim
            this invite, you can build Gift Capsules &mdash; sealed messages
            for someone you love, opened on a future date.
          </p>

          <AcceptInviteClient
            token={token}
            inviteEmail={invite.email}
            isSignedIn={Boolean(userId)}
          />

          <p className="mt-6 text-[12px] text-ink-light leading-[1.55]">
            Invite sent to <strong>{invite.email}</strong>. If you have an
            untilThen account on a different email, you can still claim this
            seat &mdash; we&rsquo;ll prompt to add this address to your
            account.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

function ErrorShell({ heading }: { heading: string }) {
  return (
    <>
      <main className="min-h-screen bg-cream flex flex-col items-center justify-center px-6 py-12 text-center">
        <Link
          href="/"
          aria-label="untilThen home"
          className="mb-10 inline-flex items-center"
        >
          <LogoSvg variant="dark" width={140} height={28} />
        </Link>
        <h1 className="text-[26px] font-extrabold text-navy tracking-[-0.4px] mb-3 max-w-[20ch]">
          {heading}
        </h1>
        <p className="text-[14px] text-ink-mid max-w-[28ch] leading-[1.6]">
          If your team meant to add you, ask them to send a fresh invite.
        </p>
      </main>
      <Footer />
    </>
  );
}
