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
    </>
  );
}
