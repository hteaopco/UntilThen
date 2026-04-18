"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import { CircleUserRound, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { LogoSvg } from "@/components/ui/LogoSvg";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-[background-color,backdrop-filter,border-color] duration-200 ${
        scrolled
          ? "bg-cream/[0.92] backdrop-blur-[12px] border-b border-navy/[0.06]"
          : "bg-transparent border-b border-transparent"
      }`}
      style={{ WebkitBackdropFilter: scrolled ? "blur(12px)" : "none" }}
    >
      <div className="mx-auto max-w-[1280px] px-5 lg:px-14 py-4 lg:py-5 flex items-center justify-between">
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
            <DesktopActions />
          </li>
        </ul>

        {/* Mobile: Get Started + user icon menu */}
        <div className="lg:hidden flex items-center gap-3">
          <SignedOut>
            <Link
              href="/sign-up"
              className="inline-flex items-center bg-amber/85 text-white px-3.5 py-2 rounded-xl text-[13px] font-semibold tracking-[0.01em] hover:bg-amber transition-colors shadow-[0_2px_12px_rgba(196,122,58,0.25)]"
            >
              Get Started
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-nav-panel"
              className="text-navy/40 hover:text-navy/70 transition-colors p-0.5"
            >
              {open ? (
                <X size={22} strokeWidth={1.25} aria-hidden="true" />
              ) : (
                <CircleUserRound size={22} strokeWidth={1.25} aria-hidden="true" />
              )}
            </button>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1 bg-amber text-white px-3.5 py-2 rounded-lg text-[13px] font-bold tracking-[0.01em] hover:bg-amber-dark transition-colors"
            >
              Your Vault
            </Link>
          </SignedIn>
        </div>
      </div>

      {/* Mobile dropdown */}
      <div
        id="mobile-nav-panel"
        className={`lg:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
          open ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"
        } ${open ? "bg-cream/[0.96] backdrop-blur-[12px]" : ""}`}
        style={{ WebkitBackdropFilter: open ? "blur(12px)" : "none" }}
      >
        <ul className="px-5 pb-6 pt-2 flex flex-col gap-1 border-t border-navy/[0.06]">
          <li>
            <Link
              href="/sign-in"
              onClick={() => setOpen(false)}
              className="block px-3 py-3 rounded-lg text-[15px] font-semibold text-navy hover:bg-amber-tint transition-colors"
            >
              Sign in
            </Link>
          </li>
          <li aria-hidden="true">
            <hr className="my-1 border-navy/[0.06]" />
          </li>
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
  );
}

function DesktopActions() {
  return (
    <>
      <SignedOut>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-[14px] font-medium text-navy/85 hover:text-navy transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            className="inline-flex items-center bg-amber/85 text-white px-3.5 py-2 rounded-xl text-[13px] font-semibold tracking-[0.01em] hover:bg-amber transition-colors shadow-[0_2px_12px_rgba(196,122,58,0.25)]"
          >
            Get Started
          </Link>
        </div>
      </SignedOut>
      <SignedIn>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 bg-amber text-white px-3.5 py-2 rounded-lg text-[13px] font-bold tracking-[0.01em] hover:bg-amber-dark transition-colors"
        >
          Your Vault
        </Link>
      </SignedIn>
    </>
  );
}
