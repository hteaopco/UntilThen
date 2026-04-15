// Decorative voice-note pill — a static visual of a play button,
// waveform bars, and a duration label. Used in marketing surfaces
// to hint at voice-note support without loading any audio.

const BARS = [4, 8, 12, 16, 20, 16, 12, 20, 16, 12, 8, 16, 20, 16, 12, 8, 4, 8, 12, 16];

export function WaveformDisplay({
  duration,
  color = "#c47a3a",
}: {
  duration: string;
  color?: string;
}) {
  return (
    <div
      className="inline-flex items-center gap-2 bg-white rounded-full px-3.5 py-2"
      style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
    >
      {/* Play button */}
      <div
        aria-hidden="true"
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        style={{ background: color }}
      >
        <svg width="10" height="12" viewBox="0 0 10 12" fill="white">
          <path d="M0 0L10 6L0 12Z" />
        </svg>
      </div>
      {/* Waveform bars */}
      <div aria-hidden="true" className="flex items-center gap-[2px]">
        {BARS.map((height, i) => (
          <div
            key={i}
            className="rounded-sm opacity-70"
            style={{ width: "3px", height: `${height}px`, background: color }}
          />
        ))}
      </div>
      {/* Duration */}
      <span className="text-[13px] font-semibold text-ink-mid shrink-0">
        {duration}
      </span>
    </div>
  );
}
