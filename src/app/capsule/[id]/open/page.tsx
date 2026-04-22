import { redirect } from "next/navigation";

import { ErrorScreen } from "@/app/reveal/[token]/ErrorScreens";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Legacy recipient URL kept alive so already-sent magic-link
 * emails keep working. Redirects to the new token-only route at
 * /reveal/{token}.
 *
 * The `?preview=1` shortcut used by the organiser preview no
 * longer routes through here — that flow is at
 * /capsules/[id]/preview and uses its own component.
 */
export default async function CapsuleOpenLegacyRedirect({
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string; preview?: string }>;
}) {
  const sp = await searchParams;
  const token = typeof sp.t === "string" ? sp.t.trim() : "";
  if (!token) {
    return <ErrorScreen message="This capsule link isn't valid." />;
  }
  redirect(`/reveal/${encodeURIComponent(token)}`);
}
