import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/account/ProfileForm";
import { r2IsConfigured, signGetUrl } from "@/lib/r2";

export const metadata = {
  title: "Profile — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AccountProfilePage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/dashboard");

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      displayName: true,
      avatarUrl: true,
    },
  });
  if (!user) redirect("/onboarding");

  // Sign a short-lived GET URL so the client can render the R2
  // object without the bucket needing to be public.
  let avatarViewUrl: string | null = null;
  if (user.avatarUrl && r2IsConfigured()) {
    try {
      avatarViewUrl = await signGetUrl(user.avatarUrl);
    } catch (err) {
      console.warn("[account] could not sign avatar URL:", err);
    }
  }

  return (
    <ProfileForm
      userId={user.id}
      firstName={user.firstName}
      lastName={user.lastName}
      displayName={user.displayName ?? ""}
      avatarViewUrl={avatarViewUrl}
    />
  );
}
