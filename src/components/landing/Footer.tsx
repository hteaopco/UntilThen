import { LogoSvg } from "@/components/ui/LogoSvg";

export function Footer() {
  return (
    <footer className="bg-warm-slate text-white">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-14 py-8 lg:py-9 flex flex-col lg:flex-row items-center justify-center gap-5 lg:gap-16 text-center">
        <LogoSvg variant="footer" width={130} height={23} />
        <ul className="flex gap-6 list-none">
          <li>
            <a
              href="#"
              className="text-[13px] text-white/90 hover:text-white transition-colors"
            >
              Privacy
            </a>
          </li>
          <li>
            <a
              href="#"
              className="text-[13px] text-white/90 hover:text-white transition-colors"
            >
              Terms
            </a>
          </li>
          <li>
            <a
              href="#"
              className="text-[13px] text-white/90 hover:text-white transition-colors"
            >
              Help
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
