"use client";

import { SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";

import { LogoSvg } from "@/components/ui/LogoSvg";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);

  // Close on ESC + lock body scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Whole nav is for prospects only — signed-in users hit
  // /dashboard directly. Wrapping in <SignedOut> hides the bar
  // for them so the marketing chrome doesn't follow them around
  // the app.
  return (
    <SignedOut>
      <nav
        className="fixed top-0 inset-x-0 z-50 bg-cream/[0.96] backdrop-blur-[16px] border-b border-navy/[0.08]"
        style={{ WebkitBackdropFilter: "blur(16px)" }}
      >
        <div className="mx-auto max-w-[1280px] px-6 lg:px-14 py-5 flex items-center justify-between">
          <Link href="/" aria-label="untilThen home" className="flex items-center">
            <LogoSvg variant="dark" />
          </Link>

          {/* Desktop nav */}
          <ul className="hidden lg:flex items-center gap-8 text-sm text-ink-mid">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="hover:text-navy transition-colors font-medium"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/sign-in"
                className="text-sm font-semibold text-navy hover:text-amber transition-colors"
              >
                Sign in
              </Link>
            </li>
            <li>
              <Link
                href="/sign-up"
                className="bg-amber text-white px-[22px] py-2.5 rounded-lg text-[13px] font-bold tracking-[0.01em] hover:bg-amber-dark hover:-translate-y-px transition-all"
              >
                Get started free
              </Link>
            </li>
          </ul>

          {/* Mobile actions: Sign in + Get started + hamburger */}
          <div className="lg:hidden flex items-center gap-3">
            <Link
              href="/sign-in"
              className="text-sm font-semibold text-navy hover:text-amber transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="bg-amber text-white px-4 py-1.5 rounded-lg text-sm font-bold"
            >
              Get started
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-nav-panel"
              className="w-10 h-10 inline-flex items-center justify-center rounded-lg border border-navy/15 text-navy hover:border-navy/40 transition-colors"
            >
              {open ? <CloseIcon /> : <HamburgerIcon />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown panel */}
        <div
          id="mobile-nav-panel"
          className={`lg:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
            open ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <ul className="px-6 pb-6 pt-2 flex flex-col gap-1 border-t border-navy/[0.06]">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-3 rounded-lg text-[15px] font-semibold text-navy hover:bg-amber-tint transition-colors"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </SignedOut>
  );
}

function HamburgerIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="17" y2="6" />
      <line x1="3" y1="10" x2="17" y2="10" />
      <line x1="3" y1="14" x2="17" y2="14" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="5" y1="5" x2="15" y2="15" />
      <line x1="15" y1="5" x2="5" y2="15" />
    </svg>
  );
}
