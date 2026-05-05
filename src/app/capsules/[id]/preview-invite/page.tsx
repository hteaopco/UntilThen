import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { CapsuleContributeForm } from "@/app/contribute/capsule/[token]/CapsuleContributeForm";
import { findOwnedCapsule } from "@/lib/capsules";

export const metadata = {
  title: "Preview contributor invite — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Organiser-only preview of the contributor invite flow.
 *
 * Mounts the same CapsuleContributeForm a real contributor sees
 * at /contribute/capsule/<inviteToken>, but with the sentinel
 * token "preview-mode" — the form's existing preview branch
 * short-circuits the submit / ensureContribution paths so any
 * "save" the organiser triggers stays in-memory and never hits
 * the API. No real CapsuleInvite row is required, so this works
 * even when the capsule has zero contributors yet.
 *
 * Auth: organiser-only. Org-attributed capsules also let
 * OWNER/ADMIN through findOwnedCapsule.
 */
export default async function PreviewContributorInvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const { id } = await params;
  const owned = await findOwnedCapsule(userId, id);
  if (!owned.ok) redirect("/dashboard");
  const c = owned.capsule;

  return (
    <>
      {/* Top banner so the organiser knows they're not in the
          real contributor flow. Links back to the capsule
          overview. Sits above the contributor form which paints
          its own fixed-position chrome at z-10. */}
      <div className="fixed top-0 left-0 right-0 z-20 bg-navy text-white text-[12px] font-semibold tracking-[0.04em] px-4 py-2 flex items-center justify-between gap-3">
        <Link
          href={`/capsules/${id}`}
          className="inline-flex items-center gap-1.5 hover:text-amber-tint transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={2.25} aria-hidden="true" />
          Back to capsule
        </Link>
        <span className="uppercase tracking-[0.14em] text-amber-tint">
          Preview · what your contributors see
        </span>
        <span className="opacity-0 inline-flex items-center gap-1.5">
          {/* spacer keeps the centre tag visually centred */}
          <ArrowLeft size={14} strokeWidth={2.25} aria-hidden="true" />
          Back to capsule
        </span>
      </div>

      {/* The form's own splash + invite layout uses a
          fixed-position logo at top-8 — push the contents down
          a hair so the banner doesn't overlap. */}
      <div className="pt-9">
        <CapsuleContributeForm
          token="preview-mode"
          capsule={{
            title: c.title,
            recipientName: c.recipientName,
            occasionType: c.occasionType,
            tone: c.tone,
            revealDate: c.revealDate.toISOString(),
            contributorDeadline: c.contributorDeadline?.toISOString() ?? null,
            organiserNote: c.organiserNote,
          }}
          invite={{ name: "" }}
        />
      </div>
    </>
  );
}
