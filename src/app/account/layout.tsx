import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar } from "@/components/ui/Avatar";
import { AccountShell } from "@/components/account/AccountShell";
import { LogoSvg } from "@/components/ui/LogoSvg";

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
    <main className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 bg-cream/90 backdrop-blur-md border-b border-navy/[0.06]">
        <div className="mx-auto max-w-[1020px] px-6 lg:px-10 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center"
            aria-label="Your vault"
          >
            <LogoSvg variant="dark" width={130} height={26} />
          </Link>
          <Avatar />
        </div>
      </header>

      <AccountShell>{children}</AccountShell>
    </main>
  );
}
