type Variant = "dark" | "light";

interface Props {
  variant?: Variant;
  width?: number;
  height?: number;
  className?: string;
}

export function LogoSvg({
  variant = "dark",
  width = 180,
  height = 36,
  className,
}: Props) {
  const untilColor = variant === "dark" ? "#1c1510" : "#fdf8f2";
  const accent = "#c05a3a";
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 300 56"
      fill="none"
      className={className}
      aria-label="UntilThen"
    >
      <text
        x="0"
        y="42"
        fontFamily="'Plus Jakarta Sans', sans-serif"
        fontSize="42"
        fontWeight="800"
        fill={untilColor}
        letterSpacing="-2"
      >
        until
      </text>
      <circle cx="178" cy="32" r="4" fill={accent} opacity="0.8" />
      <text
        x="190"
        y="42"
        fontFamily="'Plus Jakarta Sans', sans-serif"
        fontSize="42"
        fontWeight="300"
        fill={accent}
        letterSpacing="-1"
      >
        then
      </text>
    </svg>
  );
}
