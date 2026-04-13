import { LogoSvg } from "@/components/ui/LogoSvg";

export function Footer() {
  return (
    <footer className="bg-navy text-white">
      <div className="px-6 lg:px-14 py-8 lg:py-9 flex flex-col lg:flex-row items-center justify-between gap-5 text-center lg:text-left">
        <LogoSvg variant="footer" width={130} height={23} />
        <ul className="flex gap-6 list-none">
          <li>
            <a
              href="#"
              className="text-[13px] text-white opacity-30 hover:opacity-70 transition-opacity"
            >
              Privacy
            </a>
          </li>
          <li>
            <a
              href="#"
              className="text-[13px] text-white opacity-30 hover:opacity-70 transition-opacity"
            >
              Terms
            </a>
          </li>
          <li>
            <a
              href="#"
              className="text-[13px] text-white opacity-30 hover:opacity-70 transition-opacity"
            >
              Help
            </a>
          </li>
        </ul>
      </div>
    </footer>
  );
}
