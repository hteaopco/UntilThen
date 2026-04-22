import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { ChildDangerZone } from "@/components/account/ChildDangerZone";
import { ChildEditForm } from "@/components/account/ChildEditForm";
import { VaultDeliverySettings } from "@/components/account/VaultDeliverySettings";

export const metadata = {
  title: "Time Capsule Details — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AccountChildEditPage({
  params,
}: {
  params: Promise<{ childId: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/dashboard");

  const { childId } = await params;

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!user) redirect("/onboarding");

  const child = await prisma.child.findUnique({
    where: { id: childId },
    include: { vault: true },
  });
  if (!child || child.parentId !== user.id) redirect("/account/capsules");

  return (
    <div className="space-y-10">
      <ChildEditForm
        childId={child.id}
        firstName={child.firstName}
        dateOfBirth={child.dateOfBirth?.toISOString() ?? null}
        revealDate={child.vault?.revealDate?.toISOString() ?? null}
        parentDisplayName={child.parentDisplayName ?? ""}
        trusteeName={child.trusteeName ?? ""}
        trusteeEmail={child.trusteeEmail ?? ""}
        trusteePhone={child.trusteePhone ?? ""}
      />

      {child.vault && (
        <>
          <hr className="border-navy/[0.06]" />
          <VaultDeliverySettings
            childId={child.id}
            deliveryTime={child.vault.deliveryTime}
            timezone={child.vault.timezone}
          />
        </>
      )}

      <hr className="border-navy/[0.06]" />
      <ChildDangerZone childId={child.id} firstName={child.firstName} />
    </div>
  );
}
