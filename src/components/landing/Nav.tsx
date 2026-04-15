"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { LogoSvg } from "@/components/ui/LogoSvg";

const LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
] as const;

/**
 * Pre-launch / waitlist nav. Calm + premium — three elements
 * only on mobile (Logo · Sign in → · Hamburger). The desktop
 * variant keeps the inline nav links so the marketing pages
 * are still discoverable, but drops the amber "Get started"
 * CTA so it doesn't compete with the hero CTA underneath.
 *
 * Scroll behaviour: transparent over the cream page at the top,
 * a soft blurred surface once the page has scrolled past ~12px.
 */
export function Nav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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

  // Toggle the .scrolled state once the page leaves the top.
  // Single passive listener; no rAF — the bar's fade-in is
  // happening in CSS via a transition on background-color.
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

        {/* Desktop: inline nav links + sign-in / dashboard.
            "Get started" CTA removed so the nav doesn't compete
            with the hero CTA below. */}
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
            <RightAction />
          </li>
        </ul>

        {/* Mobile: three elements only — Logo (above), then
            Sign in → and the hamburger. Spacing matches the
            spec's gap-16. */}
        <div className="lg:hidden flex items-center gap-4">
          <RightAction />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav-panel"
            className="text-navy/70 hover:text-navy transition-colors p-1"
          >
            {open ? (
              <X size={24} strokeWidth={1.5} aria-hidden="true" />
            ) : (
              <Menu size={24} strokeWidth={1.5} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown panel — slides in from under the nav. */}
      <div
        id="mobile-nav-panel"
        className={`lg:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${
          open ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"
        } ${
          // Open panel needs a solid surface even if the page
          // is still at the top (transparent nav).
          open ? "bg-cream/[0.96] backdrop-blur-[12px]" : ""
        }`}
        style={{
          WebkitBackdropFilter: open ? "blur(12px)" : "none",
        }}
      >
        <ul className="px-5 pb-6 pt-2 flex flex-col gap-1 border-t border-navy/[0.06]">
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

/**
 * The right-side action — same component on desktop and mobile.
 *
 *   Signed out → "Sign in →" plain text link
 *   Signed in  → "Dashboard →" plain text link
 *
 * Quiet styling per the brief: 14px, medium weight, primary
 * text colour at ~85% opacity, no button background or border.
 */
function RightAction() {
  return (
    <>
      <SignedOut>
        <Link
          href="/sign-in"
          className="text-[14px] font-medium text-navy/85 hover:text-navy transition-colors"
        >
          Sign in →
        </Link>
      </SignedOut>
      <SignedIn>
        <Link
          href="/dashboard"
          className="text-[14px] font-medium text-navy/85 hover:text-navy transition-colors"
        >
          Dashboard →
        </Link>
      </SignedIn>
    </>
  );
}
