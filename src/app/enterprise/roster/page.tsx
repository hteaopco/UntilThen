import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getOrgContextByClerkId } from "@/lib/orgs";

import { RosterTabs } from "./RosterTabs";

export const metadata = {
  title: "Roster — Enterprise — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function RosterPage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  const ctx = await getOrgContextByClerkId(userId);
  if (!ctx) {
    redirect("/home");
  }
  // MEMBERs aren't supposed to land here — bounce back to the
  // landing page rather than 403.
  if (ctx!.role !== "OWNER" && ctx!.role !== "ADMIN") {
    redirect("/enterprise");
  }

  return (
    <RosterTabs
      orgId={ctx!.organizationId}
      viewerRole={ctx!.role as "OWNER" | "ADMIN"}
    />
  );
}
