import type { CSSProperties } from "react";

interface Props {
  width?: number;
  height?: number;
  color?: string;
  opacity?: number;
  className?: string;
  style?: CSSProperties;
}

export function QuillSvg({
  width = 200,
  height = 320,
  color = "currentColor",
  opacity = 1,
  className,
  style,
}: Props) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 200 320"
      fill="none"
      style={{ color, opacity, ...style }}
      className={className}
      aria-hidden="true"
    >
      {/* Spine */}
      <path
        d="M 100 10 C 130 40, 160 80, 155 130 C 150 170, 120 200, 100 310"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
      {/* Right barbs */}
      <path d="M 105 30 C 125 25, 155 30, 165 45" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M 108 50 C 130 42, 162 48, 170 65" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M 110 70 C 134 60, 165 68, 172 87" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M 112 90 C 136 78, 164 88, 168 108" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M 113 110 C 136 98, 160 110, 162 130" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M 112 130 C 132 120, 152 132, 150 152" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* Left barbs */}
      <path d="M 95 30 C 75 25, 48 32, 38 48" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M 92 50 C 70 44, 40 52, 30 70" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M 90 70 C 66 62, 36 72, 28 92" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M 88 90 C 64 82, 36 94, 30 116" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M 87 110 C 64 102, 38 116, 34 138" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* Tip */}
      <path
        d="M 100 270 C 98 285, 97 295, 100 310"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
