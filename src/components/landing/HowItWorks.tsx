import type { ReactNode } from "react";

// ── Thin-line icons (SF Symbols-ish, 1.5px stroke, rounded joins) ──

function PencilIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
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
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
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
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
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

// ── Delight moments (subtle, implied — nothing animated) ──

function HandwrittenUnderline() {
  // Faint gold squiggle under the title — feels like a hand-drawn mark.
  return (
    <svg
      width="150"
      height="10"
      viewBox="0 0 150 10"
      fill="none"
      aria-hidden="true"
      className="mt-1"
    >
      <path
        d="M3 5 C 20 2, 40 8, 55 4 C 72 1, 92 8, 108 4 C 124 1, 140 7, 147 5"
        stroke="#c9a84c"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
    </svg>
  );
}

function LockGlow() {
  // Soft gold halo behind the lock icon.
  return (
    <div
      aria-hidden="true"
      className="absolute -inset-5 rounded-full pointer-events-none"
      style={{
        background:
          "radial-gradient(circle, rgba(201,168,76,0.28) 0%, transparent 65%)",
      }}
    />
  );
}

function ConfettiBurst() {
  // Soft radial burst + a handful of gold/sky pinpricks behind the gift.
  const dots: Array<{
    top: number;
    left: number;
    size: number;
    color: string;
    opacity: number;
  }> = [
    { top: 6, left: 14, size: 3, color: "#c9a84c", opacity: 0.7 },
    { top: 12, left: 46, size: 2, color: "#4a9edd", opacity: 0.65 },
    { top: 30, left: 50, size: 3, color: "#c9a84c", opacity: 0.55 },
    { top: 42, left: 18, size: 2, color: "#4a9edd", opacity: 0.5 },
    { top: 34, left: 0, size: 3, color: "#c9a84c", opacity: 0.6 },
    { top: 16, left: -4, size: 2, color: "#4a9edd", opacity: 0.55 },
  ];
  return (
    <div aria-hidden="true" className="absolute -inset-4 pointer-events-none">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(201,168,76,0.15) 0%, transparent 60%)",
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
  tag: string;
  title: string;
  body: string;
  bg: string;
  hoverBg: string;
  icon: ReactNode;
  iconDelight?: ReactNode;
  titleDelight?: ReactNode;
};

function Step({
  tag,
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
      className={`group relative overflow-hidden rounded-2xl border border-navy/[0.08] ${bg} ${hoverBg} hover:border-sky/20 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,31,61,0.08)] transition-all px-8 py-9`}
    >
      <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-sky mb-5">
        {tag}
      </p>
      <div className="relative w-fit mb-5 text-navy">
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

        <div className="grid gap-4 lg:gap-6 lg:grid-cols-3">
          <Step
            tag="Step 1"
            bg="bg-[#fdfbf5]"
            hoverBg="hover:bg-[#f9f4e6]"
            icon={<PencilIcon />}
            titleDelight={<HandwrittenUnderline />}
            title="Leave something behind"
            body="Write a letter, record a voice note, or upload a photo with a caption. Each entry takes minutes — and lasts a lifetime."
          />
          <Step
            tag="Step 2"
            bg="bg-[#f4f7f5]"
            hoverBg="hover:bg-[#eaf1ed]"
            icon={<LockIcon />}
            iconDelight={<LockGlow />}
            title="Not for today"
            body="Every entry is sealed until a milestone you choose — their 13th birthday, graduation, or the day they fall in love."
          />
          <Step
            tag="Step 3"
            bg="bg-[#f1f5fa]"
            hoverBg="hover:bg-[#e6eff7]"
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
