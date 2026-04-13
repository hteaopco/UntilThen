import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { OnboardingForm } from "./OnboardingForm";

export const metadata = {
  title: "Welcome to untilThen",
};

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  // Short-circuit server-side so already-onboarded users don't see
  // the form flash before a client-side redirect.
  if (process.env.DATABASE_URL) {
    try {
      const { prisma } = await import("@/lib/prisma");
      const existing = await prisma.user.findUnique({
        where: { clerkId: userId },
      });
      if (existing) redirect("/dashboard");
    } catch (err) {
      // If the DB is unreachable we still let the user see the form;
      // the POST will surface the real error.
      console.error("[onboarding] check error:", err);
    }
  }

  return <OnboardingForm />;
}
