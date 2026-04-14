import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { ProfileForm } from "@/components/account/ProfileForm";

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
    },
  });
  if (!user) redirect("/onboarding");

  return (
    <ProfileForm
      firstName={user.firstName}
      lastName={user.lastName}
      displayName={user.displayName ?? ""}
    />
  );
}
