import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { OnboardingForm } from "./OnboardingForm";

export const metadata = {
  title: "Welcome to untilThen",
};

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ path?: string; add?: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const sp = await searchParams;
  const addVault = sp.add === "vault";
  const path = sp.path === "capsule" ? "capsule" : undefined;

  // Short-circuit server-side so already-onboarded users don't
  // see the form flash before a client-side redirect — unless
  // they arrived with ?add=vault to add a child vault later
  // (flips ORGANISER → BOTH).
  let existingUserType: "PARENT" | "ORGANISER" | "BOTH" | null = null;
  let hasVault = false;
  if (process.env.DATABASE_URL) {
    try {
      const { prisma } = await import("@/lib/prisma");
      const existing = await prisma.user.findUnique({
        where: { clerkId: userId },
        include: { children: { include: { vault: true } } },
      });
      if (existing) {
        existingUserType = existing.userType;
        hasVault = existing.children.some((c) => c.vault !== null);
        // Already onboarded: send to dashboard unless they're
        // explicitly here to add a vault AND don't already have
        // one. Anything else skips the wizard.
        if (!addVault || hasVault) {
          redirect("/dashboard");
        }
      }
    } catch (err) {
      console.error("[onboarding] check error:", err);
    }
  }

  return (
    <OnboardingForm
      initialPath={path ?? null}
      addVaultOnly={addVault && Boolean(existingUserType) && !hasVault}
    />
  );
}
