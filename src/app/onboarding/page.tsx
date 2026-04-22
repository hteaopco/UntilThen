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
  searchParams: Promise<{ path?: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const sp = await searchParams;
  const path = sp.path === "capsule" ? "capsule" : undefined;

  // Existing users never belong on the onboarding form anymore —
  // everything a returning user could want to do (create a new
  // vault, create a gift capsule, etc.) is reachable from the
  // dashboard. Bounce them there so refresh / magic-link quirks
  // don't dump them back into signup.
  if (process.env.DATABASE_URL) {
    try {
      const { prisma } = await import("@/lib/prisma");
      const existing = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true },
      });
      if (existing) redirect("/dashboard");
    } catch (err) {
      console.error("[onboarding] check error:", err);
    }
  }

  return <OnboardingForm initialPath={path ?? null} />;
}
