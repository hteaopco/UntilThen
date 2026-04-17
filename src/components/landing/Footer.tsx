import Link from "next/link";

import { LogoSvg } from "@/components/ui/LogoSvg";

// Footer is shown on every page where it's rendered. The
// dashboard explicitly includes it for signed-in users so the
// Privacy / Terms / Help row is always reachable.
export function Footer() {
  return (
    <footer className="bg-warm-slate text-white">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-14 py-8 lg:py-9 flex flex-col lg:flex-row items-center justify-center gap-5 lg:gap-16 text-center">
        <LogoSvg variant="footer" width={130} height={23} />
        <ul className="flex gap-6 list-none">
          <li>
            <Link
              href="/privacy"
              className="text-[13px] text-white/90 hover:text-white transition-colors"
            >
              Privacy
            </Link>
          </li>
          <li>
            <Link
              href="/terms"
              className="text-[13px] text-white/90 hover:text-white transition-colors"
            >
              Terms
            </Link>
          </li>
          <li>
            <a
              href="mailto:hello@untilthenapp.io"
              className="text-[13px] text-white/90 hover:text-white transition-colors"
            >
              Help
            </a>
          </li>
          <li>
            <Link
              href="/faq"
              className="text-[13px] text-white/90 hover:text-white transition-colors"
            >
              FAQ
            </Link>
          </li>
          <li>
            <Link
              href="/blog"
              className="text-[13px] text-white/90 hover:text-white transition-colors"
            >
              Blog
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
