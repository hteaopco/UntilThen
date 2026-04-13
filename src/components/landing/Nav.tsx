import { LogoSvg } from "@/components/ui/LogoSvg";
import Link from "next/link";

export function Nav() {
  return (
    <nav
      className="fixed top-0 inset-x-0 z-50 bg-white/[0.96] backdrop-blur-[16px] border-b border-navy/[0.08]"
      style={{ WebkitBackdropFilter: "blur(16px)" }}
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-14 py-5 flex items-center justify-between">
        <Link href="/" aria-label="untilThen home" className="flex items-center">
          <LogoSvg variant="dark" />
        </Link>
        <ul className="hidden lg:flex items-center gap-8 text-sm text-ink-mid">
          <li>
            <Link
              href="/#how"
              className="hover:text-navy transition-colors font-medium"
            >
              How it works
            </Link>
          </li>
          <li>
            <Link
              href="/#features"
              className="hover:text-navy transition-colors font-medium"
            >
              Features
            </Link>
          </li>
          <li>
            <Link
              href="/#pricing"
              className="hover:text-navy transition-colors font-medium"
            >
              Pricing
            </Link>
          </li>
          <li>
            <Link
              href="/faq"
              className="hover:text-navy transition-colors font-medium"
            >
              FAQ
            </Link>
          </li>
          <li>
            <Link
              href="/#cta"
              className="bg-navy text-white px-[22px] py-2.5 rounded-lg text-[13px] font-bold tracking-[0.01em] hover:bg-navy-mid hover:-translate-y-px transition-all"
            >
              Join waitlist
            </Link>
          </li>
        </ul>
        <div className="lg:hidden flex items-center gap-4">
          <Link
            href="/faq"
            className="text-sm text-ink-mid hover:text-navy transition-colors font-medium"
          >
            FAQ
          </Link>
          <Link
            href="/#cta"
            className="bg-navy text-white px-4 py-1.5 rounded-lg text-sm font-bold"
          >
            Join waitlist
          </Link>
        </div>
      </div>
    </nav>
  );
}
