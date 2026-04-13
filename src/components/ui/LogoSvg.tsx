type Variant = "dark" | "light" | "footer";

interface Props {
  variant?: Variant;
  width?: number;
  height?: number;
  className?: string;
}

// Logo wordmark — pure SVG, no image files.
// The <rect> covers the native i-dot of "until" so the gold heart can sit
// in its place. Its fill must match the surface colour behind the logo.
export function LogoSvg({
  variant = "dark",
  width = 148,
  height = 26,
  className,
}: Props) {
  const isDark = variant === "dark";
  const untilFill = isDark ? "#0f1f3d" : "#ffffff";
  const untilOpacity = isDark ? 1 : 0.6;
  const rectFill = isDark ? "#ffffff" : "#0f1f3d";

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 232 56"
      fill="none"
      className={className}
      aria-label="untilThen"
    >
      <text
        y="44"
        fontFamily="'DM Sans', sans-serif"
        fontSize="44"
        fontWeight="800"
        letterSpacing="-1"
      >
        <tspan fill={untilFill} fillOpacity={untilOpacity}>
          until
        </tspan>
        <tspan fill="#4a9edd">Then</tspan>
      </text>
      {/* Cover the native i-dot with the surface colour */}
      <rect x="119" y="0" width="16" height="11" fill={rectFill} />
      {/* Gold heart — sits above the gap between "h" and "e" in "Then" */}
      <path
        d="M 166 10 C 166 7, 169 5, 172 7.5 C 175 5, 178 7, 178 10 C 178 14, 172 18, 172 18 C 172 18, 166 14, 166 10 Z"
        fill="#c9a84c"
      />
    </svg>
  );
}
