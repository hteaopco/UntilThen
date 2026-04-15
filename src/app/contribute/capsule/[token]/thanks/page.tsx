import { Sparkles } from "lucide-react";

export const metadata = {
  title: "Thanks for contributing — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function CapsuleThanksPage({
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
        select: { title: true, recipientName: true, revealDate: true },
      },
    },
  });
  const recipient = invite?.capsule.recipientName ?? "them";
  const title = invite?.capsule.title ?? "their capsule";
  const reveal = invite?.capsule.revealDate;
  const revealLabel = reveal
    ? reveal.toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "reveal day";

  return (
    <main className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="max-w-[440px] text-center">
        <div
          aria-hidden="true"
          className="mx-auto w-12 h-12 rounded-full bg-amber-tint text-amber flex items-center justify-center mb-4"
        >
          <Sparkles size={20} strokeWidth={1.5} />
        </div>
        <h1 className="text-[26px] font-extrabold text-navy tracking-[-0.4px] leading-tight">
          Already added to {recipient}&rsquo;s capsule.
        </h1>
        <p className="mt-3 text-sm text-ink-mid leading-[1.6]">
          {title} opens on {revealLabel}. Thank you for showing up.
        </p>
      </div>
    </main>
  );
}
