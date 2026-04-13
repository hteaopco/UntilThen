import type { ReactNode } from "react";

// ── Thin-line icons: 36px, 1.25 stroke, rounded joins, SF Symbols-ish ──

function PencilIcon() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function GiftIcon() {
  return (
    <svg
      width="36"
      height="36"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
    </svg>
  );
}

// ── Delight moments ──

function HandwrittenUnderline() {
  // Thinner, less perfect — organic control points so it doesn't read as a CSS sine wave.
  return (
    <svg
      width="160"
      height="10"
      viewBox="0 0 160 10"
      fill="none"
      aria-hidden="true"
      className="mt-1.5 -ml-0.5"
    >
      <path
        d="M3 5.4 C 14 4.8, 27 6.4, 42 5.1 C 58 3.6, 74 6.7, 90 5 C 104 3.4, 120 6.2, 136 5.3 C 146 4.8, 152 5.6, 157 5.1"
        stroke="#c9a84c"
        strokeWidth="1.1"
        strokeLinecap="round"
        fill="none"
        opacity="0.55"
      />
    </svg>
  );
}

function LockGlow() {
  return (
    <div
      aria-hidden="true"
      className="absolute -inset-5 rounded-full pointer-events-none"
      style={{
        background:
          "radial-gradient(circle, rgba(201,168,76,0.26) 0%, transparent 65%)",
      }}
    />
  );
}

function ConfettiBurst() {
  // Cleaner, fewer dots. Soft gold halo behind them sells "moment".
  const dots: Array<{
    top: number;
    left: number;
    size: number;
    color: string;
    opacity: number;
  }> = [
    { top: 2, left: 22, size: 3, color: "#c9a84c", opacity: 0.75 },
    { top: 14, left: 50, size: 2, color: "#4a9edd", opacity: 0.6 },
    { top: 40, left: 46, size: 3, color: "#c9a84c", opacity: 0.55 },
    { top: 42, left: 6, size: 2, color: "#4a9edd", opacity: 0.55 },
    { top: 20, left: -6, size: 3, color: "#c9a84c", opacity: 0.6 },
  ];
  return (
    <div aria-hidden="true" className="absolute -inset-4 pointer-events-none">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(201,168,76,0.22) 0%, transparent 62%)",
        }}
      />
      {dots.map((d, i) => (
        <span
          key={i}
          className="absolute rounded-full"
          style={{
            top: d.top,
            left: d.left,
            width: d.size,
            height: d.size,
            background: d.color,
            opacity: d.opacity,
          }}
        />
      ))}
    </div>
  );
}

// ── Card ──

type StepProps = {
  label: string;
  title: string;
  body: string;
  bg: string;
  hoverBg: string;
  icon: ReactNode;
  iconDelight?: ReactNode;
  titleDelight?: ReactNode;
};

function Step({
  label,
  title,
  body,
  bg,
  hoverBg,
  icon,
  iconDelight,
  titleDelight,
}: StepProps) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-navy/[0.08] ${bg} ${hoverBg} hover:border-sky/20 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,31,61,0.08)] transition-all px-8 pt-7 pb-8`}
    >
      <p className="text-[10px] uppercase tracking-[0.2em] font-semibold text-navy/40 mb-5">
        {label}
      </p>
      <div className="relative w-fit mb-3 text-navy">
        {iconDelight}
        <div className="relative">{icon}</div>
      </div>
      <h3 className="text-[18px] font-bold text-navy tracking-[-0.3px] leading-tight">
        {title}
      </h3>
      {titleDelight}
      <p className="mt-2 text-sm leading-[1.75] text-ink-mid">{body}</p>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section id="how" className="bg-white">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-14 py-16 lg:py-24">
        <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-sky mb-3.5">
          How it works
        </p>
        <h2 className="text-[clamp(26px,3.5vw,46px)] font-extrabold tracking-[-1.5px] leading-[1.08] text-navy mb-16 max-w-[560px]">
          It&rsquo;s Simple. Capture
          <br />
          <span className="font-light italic text-sky">emotions</span> as they
          happen.
        </h2>

        <div className="grid gap-5 lg:gap-8 lg:grid-cols-3">
          <Step
            label="Create"
            bg="bg-[#fdfbf5]"
            hoverBg="hover:bg-[#f9f4e6]"
            icon={<PencilIcon />}
            titleDelight={<HandwrittenUnderline />}
            title="Leave something behind"
            body="Write a letter, record a voice note, or upload a photo with a caption. Each entry takes minutes — and lasts a lifetime."
          />
          <Step
            label="Seal"
            bg="bg-[#f4f7f5]"
            hoverBg="hover:bg-[#eaf1ed]"
            icon={<LockIcon />}
            iconDelight={<LockGlow />}
            title="Not for today"
            body="Every entry is sealed until a milestone you choose — their 13th birthday, graduation, or the day they fall in love."
          />
          <Step
            label="Reveal"
            bg="bg-[#eef4fa]"
            hoverBg="hover:bg-[#e2ecf7]"
            icon={<GiftIcon />}
            iconDelight={<ConfettiBurst />}
            title={"A moment they\u2019ll never forget"}
            body="On reveal day, your child opens a vault of letters from across their entire childhood — each one a gift from a past version of you."
          />
        </div>
      </div>
    </section>
  );
}
