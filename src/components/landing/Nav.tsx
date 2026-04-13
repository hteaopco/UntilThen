import { LogoSvg } from "@/components/ui/LogoSvg";

export function Nav() {
  return (
    <nav
      className="fixed top-0 inset-x-0 z-50 bg-white/[0.96] backdrop-blur-[16px] border-b border-navy/[0.08]"
      style={{ WebkitBackdropFilter: "blur(16px)" }}
    >
      <div className="mx-auto max-w-[1280px] px-6 lg:px-14 py-5 flex items-center justify-between">
        <a href="#top" aria-label="untilThen home" className="flex items-center">
          <LogoSvg variant="dark" />
        </a>
        <ul className="hidden lg:flex items-center gap-8 text-sm text-ink-mid">
          <li>
            <a href="#how" className="hover:text-navy transition-colors font-medium">
              How it works
            </a>
          </li>
          <li>
            <a href="#features" className="hover:text-navy transition-colors font-medium">
              Features
            </a>
          </li>
          <li>
            <a href="#pricing" className="hover:text-navy transition-colors font-medium">
              Pricing
            </a>
          </li>
          <li>
            <a
              href="#cta"
              className="bg-navy text-white px-[22px] py-2.5 rounded-lg text-[13px] font-bold tracking-[0.01em] hover:bg-navy-mid hover:-translate-y-px transition-all"
            >
              Join waitlist
            </a>
          </li>
        </ul>
        <a
          href="#cta"
          className="lg:hidden bg-navy text-white px-4 py-1.5 rounded-lg text-sm font-bold"
        >
          Join waitlist
        </a>
      </div>
    </nav>
  );
}
