"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { SignOutButton } from "@/app/admin/SignOutButton";

const TABS: Array<{ href: string; label: string }> = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/moderation", label: "Moderation" },
  { href: "/admin/emails", label: "Emails" },
  { href: "/admin/previews", label: "Previews" },
  { href: "/admin/tones", label: "Tones" },
  { href: "/admin/qa", label: "QA" },
  { href: "/admin/checklist", label: "Checklist" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminHeader({ actions }: { actions?: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
        <h1 className="text-2xl font-extrabold text-navy tracking-[-0.5px]">
          untilThen Admin
        </h1>
        <div className="flex items-center gap-4">
          {actions}
          <SignOutButton />
        </div>
      </div>
      <nav
        aria-label="Admin sections"
        className="flex flex-wrap items-center gap-1 border-b border-navy/10"
      >
        {TABS.map((tab) => {
          const active =
            tab.href === "/admin"
              ? pathname === "/admin"
              : pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              prefetch={false}
              className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                active
                  ? "text-navy border-navy"
                  : "text-ink-mid border-transparent hover:text-navy"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
