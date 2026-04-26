import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { Footer } from "@/components/landing/Footer";
import { TopNav } from "@/components/ui/TopNav";
import { getOrgContextByClerkId } from "@/lib/orgs";

import { EnterpriseShell } from "@/components/enterprise/EnterpriseShell";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Layout shared by every /enterprise/* page. Bounces signed-out
 * viewers to /sign-in. Bounces signed-in users without an org
 * membership back to /home (no point landing them on a 403).
 *
 * MEMBERs see only the center "Create a Gift Capsule" CTA — no
 * Roster, no Stat Board (those are admin surfaces). The shell
 * client-component branches on role.
 */
export default async function EnterpriseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const ctx = await getOrgContextByClerkId(userId);
  if (!ctx) {
    redirect("/home");
  }

  return (
    <>
      <main className="min-h-screen bg-cream">
        <TopNav />
        <EnterpriseShell
          orgId={ctx!.organizationId}
          orgName={ctx!.organizationName}
          role={ctx!.role}
        >
          {children}
        </EnterpriseShell>
      </main>
      <Footer />
    </>
  );
}
