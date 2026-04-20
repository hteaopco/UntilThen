"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, MoreHorizontal, PenSquare, Users } from "lucide-react";

type Tab = {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Routes that should highlight this tab as active. */
  match: (pathname: string) => boolean;
};

const TABS: Tab[] = [
  {
    href: "/dashboard2",
    label: "Vault",
    icon: <Archive size={22} strokeWidth={1.5} />,
    match: (p) => p === "/dashboard2" || p.startsWith("/dashboard"),
  },
  {
    href: "/dashboard/new",
    label: "Create",
    icon: <PenSquare size={22} strokeWidth={1.5} />,
    match: (p) => p.includes("/new") || p.includes("/entry"),
  },
  {
    href: "/account/capsules",
    label: "Contributors",
    icon: <Users size={22} strokeWidth={1.5} />,
    match: (p) => p.startsWith("/account/capsules"),
  },
  {
    href: "/account",
    label: "More",
    icon: <MoreHorizontal size={22} strokeWidth={1.5} />,
    match: (p) => p === "/account",
  },
];

export function MobileTabBar() {
  const pathname = usePathname() ?? "";

  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed bottom-4 left-4 right-4 z-40 bg-white rounded-full border border-navy/10 shadow-[0_10px_30px_-8px_rgba(15,31,61,0.15),0_2px_6px_-2px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="flex items-stretch justify-around px-2 py-2">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition-colors ${
                  active ? "text-amber" : "text-ink-light hover:text-navy"
                }`}
              >
                <span
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    active ? "bg-amber-tint text-amber" : "text-ink-mid"
                  }`}
                >
                  {tab.icon}
                </span>
                <span className="text-[11px] font-semibold tracking-[0.02em]">
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
