import { LogoSvg } from "@/components/ui/LogoSvg";

export function Footer() {
  return (
    <footer className="bg-dark text-cream">
      <div className="mx-auto max-w-6xl px-6 py-16 grid gap-10 lg:grid-cols-3 lg:items-center lg:text-left text-center">
        <div className="flex lg:justify-start justify-center">
          <LogoSvg variant="light" width={160} height={32} />
        </div>
        <p className="text-cream/70 italic">
          Letters from the past, opened in the future.
        </p>
        <nav className="flex gap-8 lg:justify-end justify-center text-sm text-cream/70">
          <a href="#" className="hover:text-cream transition-colors">
            Privacy
          </a>
          <a href="#" className="hover:text-cream transition-colors">
            Terms
          </a>
          <a href="#" className="hover:text-cream transition-colors">
            Help
          </a>
        </nav>
      </div>
    </footer>
  );
}
