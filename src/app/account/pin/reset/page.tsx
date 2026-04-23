import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { PinResetClient } from "./PinResetClient";

export const metadata = {
  title: "Reset vault PIN — untilThen",
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function PinResetPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  return <PinResetClient token={token} />;
}
