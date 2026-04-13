import { LogoSvg } from "@/components/ui/LogoSvg";

export function Nav() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-cream/[0.88] backdrop-blur-md border-b border-ink/[0.06]">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
        <a href="#top" aria-label="UntilThen home" className="flex items-center">
          <LogoSvg variant="dark" width={140} height={28} />
        </a>
        <div className="hidden lg:flex items-center gap-10 text-sm text-ink/70">
          <a href="#how" className="hover:text-ink transition-colors">
            How it works
          </a>
          <a href="#features" className="hover:text-ink transition-colors">
            Features
          </a>
          <a href="#pricing" className="hover:text-ink transition-colors">
            Pricing
          </a>
          <a
            href="#cta"
            className="bg-rust text-cream px-5 py-2 rounded-full hover:opacity-90 transition-opacity font-medium"
          >
            Start writing
          </a>
        </div>
        <a
          href="#cta"
          className="lg:hidden bg-rust text-cream px-4 py-1.5 rounded-full text-sm font-medium"
        >
          Start writing
        </a>
      </div>
    </nav>
  );
}
