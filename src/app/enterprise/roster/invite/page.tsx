import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getOrgContextByClerkId } from "@/lib/orgs";

import { InviteClient } from "./InviteClient";

export const metadata = {
  title: "Invite — Enterprise — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function InvitePage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  const ctx = await getOrgContextByClerkId(userId);
  if (!ctx) {
    redirect("/home");
  }
  if (ctx!.role !== "OWNER" && ctx!.role !== "ADMIN") {
    redirect("/enterprise");
  }

  return <InviteClient orgId={ctx!.organizationId} />;
}
