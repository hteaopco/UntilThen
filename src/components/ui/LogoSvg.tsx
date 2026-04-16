import Image from "next/image";

interface Props {
  variant?: "dark" | "light" | "footer";
  width?: number;
  height?: number;
  className?: string;
}

export function LogoSvg({
  variant = "dark",
  width = 148,
  height = 26,
  className,
}: Props) {
  const invert = variant === "light" || variant === "footer";

  return (
    <Image
      src="/UTALogo.png"
      alt="untilThen"
      width={width}
      height={height}
      className={`${invert ? "brightness-0 invert" : ""} ${className ?? ""}`}
      priority
    />
  );
}
