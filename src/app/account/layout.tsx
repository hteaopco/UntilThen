import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { AccountShell } from "@/components/account/AccountShell";
import { Footer } from "@/components/landing/Footer";
import { TopNav } from "@/components/ui/TopNav";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  return (
    <>
      <main className="min-h-screen bg-cream">
        <TopNav />
        <AccountShell>{children}</AccountShell>
      </main>
      <Footer />
      {/* Mobile bottom-tab nav inside AccountShell is fixed and
          covers the last ~64px of the viewport. Without this
          spacer, the Footer sits permanently underneath it and
          can never be fully seen. The spacer matches Footer's
          warm-slate background so the Footer reads as extending
          past the nav rather than as a stray colour band. */}
      <div aria-hidden="true" className="lg:hidden h-20 bg-warm-slate" />
    </>
  );
}
