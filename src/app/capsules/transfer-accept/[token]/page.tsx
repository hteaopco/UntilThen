import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { Footer } from "@/components/landing/Footer";
import { TopNav } from "@/components/ui/TopNav";

import { TransferAcceptClient } from "./TransferAcceptClient";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = { title: "Accept capsule transfer — untilThen" };

export default async function TransferAcceptPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { userId } = auth();
  if (!userId)
    redirect(
      `/sign-in?redirect_url=${encodeURIComponent(
        `/capsules/transfer-accept/${token}`,
      )}`,
    );

  const { prisma } = await import("@/lib/prisma");
  const transfer = await prisma.capsuleTransfer.findUnique({
    where: { token },
    select: {
      id: true,
      status: true,
      toEmail: true,
      toFirstName: true,
      capsule: { select: { id: true, title: true, recipientName: true } },
    },
  });

  return (
    <>
      <TopNav />
      <main className="min-h-[60vh] bg-cream">
        <section className="mx-auto max-w-[560px] px-6 py-16">
          {!transfer ? (
            <Notice
              title="Invite not found"
              body="This transfer link doesn't exist or has been canceled. Ask the original purchaser to send a new one."
            />
          ) : transfer.status !== "PENDING" ? (
            <Notice
              title="Already used"
              body="This invite has already been accepted or canceled."
            />
          ) : (
            <TransferAcceptClient
              token={token}
              capsuleTitle={transfer.capsule.title}
              recipientName={transfer.capsule.recipientName}
              toEmail={transfer.toEmail}
              toFirstName={transfer.toFirstName}
            />
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-amber/25 bg-white px-7 py-7">
      <h1 className="text-2xl font-extrabold text-navy tracking-[-0.3px]">
        {title}
      </h1>
      <p className="mt-3 text-[15px] text-ink-mid leading-[1.55]">{body}</p>
    </div>
  );
}
