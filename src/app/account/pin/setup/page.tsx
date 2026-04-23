import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { PinSetupClient } from "./PinSetupClient";

export const metadata = {
  title: "Set up vault PIN — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PinSetupPage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  if (!process.env.DATABASE_URL) redirect("/dashboard");

  // If a PIN is already set, bounce to /account — setup is only
  // for going from "off" to "on". Users who want to change their
  // PIN use the inline modal in the settings card instead.
  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { pinHash: true },
  });
  if (user?.pinHash) redirect("/account");

  return <PinSetupClient />;
}
