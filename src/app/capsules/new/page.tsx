import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { CapsuleCreationFlow } from "./CapsuleCreationFlow";

export const metadata = {
  title: "Create a Memory Capsule — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function NewCapsulePage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in?redirect_url=/capsules/new");
  return <CapsuleCreationFlow />;
}
