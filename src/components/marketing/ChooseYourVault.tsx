import {
  CalendarCheck,
  CalendarDays,
  Gift,
  Heart,
  Lock,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { WaveformDisplay } from "@/components/ui/WaveformDisplay";

/**
 * "Choose your vault" — the two-path introduction that sits between
 * the hero and the "How it works" section on the landing page.
 *
 * Marketing names intentionally differ from the product codenames:
 *   Future Vault = Child Vault   → /sign-up              ($3.99/mo)
 *   Shared Gift  = Memory Capsule → /sign-up?path=capsule ($9.99 one-time)
 *
 * Don't rename in-product — these labels live only on the landing
 * page so the two creation paths feel like parallel versions of the
 * same core product instead of competing CTAs.
 */
export function ChooseYourVault() {
  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-14 py-20 lg:py-24">
        {/* Header block: eyebrow pill + heading + subheading, centred. */}
        <div className="text-center max-w-[640px] mx-auto mb-12 lg:mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.12em] uppercase text-amber bg-amber-tint px-[14px] py-1.5 rounded-md mb-6">
            <span aria-hidden="true">✦</span>
            Choose your vault
          </div>
          <h2 className="text-[clamp(36px,4vw,52px)] font-extrabold leading-[1.1] tracking-[-1.5px] text-navy">
            What would you like to create?
          </h2>
          <p className="mt-4 text-[18px] text-ink-mid leading-[1.55]">
            Two ways to save love. Both last a lifetime.
          </p>
        </div>

        {/* Card grid — equal-height side-by-side on desktop, stacked
            with Future Vault first on mobile. */}
        <div className="grid gap-5 sm:gap-8 lg:grid-cols-2 items-stretch max-w-[960px] mx-auto">
          <FutureVaultCard />
          <SharedGiftCard />
        </div>

        {/* Bottom note */}
        <p className="mt-10 text-center text-[15px] text-ink-mid">
          Not sure?{" "}
          <Link
            href="/sign-up"
            className="text-amber font-semibold hover:text-amber-dark transition-colors"
          >
            You can always create both.
          </Link>
        </p>
      </div>
    </section>
  );
}

/**
 * Future Vault card — primary, amber-tinted. "Write now. They'll
 * open later." Carries the MOST POPULAR pill and links to the child
 * vault sign-up path.
 */
function FutureVaultCard() {
  return (
    <Link
      href="/sign-up"
      aria-label="Start a future vault"
      className="group relative flex flex-col rounded-[20px] border-[1.5px] bg-amber-tint p-7 lg:p-8 transition-all duration-150 hover:-translate-y-[3px] hover:shadow-[0_8px_32px_rgba(196,122,58,0.18)]"
      style={{
        borderColor: "rgba(196,122,58,0.25)",
        boxShadow: "0 4px 24px rgba(196,122,58,0.1)",
      }}
    >
      {/* MOST POPULAR pill — top-left. */}
      <div
        className="absolute -top-3 left-6 inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] uppercase text-amber px-2.5 py-1 rounded-full"
        style={{ background: "rgba(196,122,58,0.15)" }}
      >
        <Heart size={11} strokeWidth={2} aria-hidden="true" fill="currentColor" />
        Most popular
      </div>

      <FutureVaultVisual />

      <CardLabel icon={CalendarDays} color="amber">
        For their future
      </CardLabel>
      <h3 className="text-[22px] font-extrabold text-navy tracking-[-0.5px] leading-[1.25]">
        Write now. They&rsquo;ll open later.
      </h3>
      <p className="text-[15px] text-ink-mid leading-[1.6]">
        Create a private vault of letters, voice notes, photos, and videos
        for someone you love. They&rsquo;ll unlock it on a birthday,
        graduation, or any milestone you choose.
      </p>

      <ul className="space-y-2 mt-1">
        <Bullet icon={CalendarDays} color="amber">
          Choose the reveal date
        </Bullet>
        <Bullet icon={Lock} color="amber">
          Just for them
        </Bullet>
        <Bullet icon={Heart} color="amber">
          Build it over time
        </Bullet>
      </ul>

      <div className="mt-auto pt-5">
        {/* Inner CTA — visually prominent but the whole card is the
            link. The nested button is styled but inherits the link's
            click; keep as a span so it doesn't become a nested anchor. */}
        <span className="block w-full text-center bg-amber text-white font-bold text-[16px] py-3.5 px-6 rounded-[10px] transition-colors group-hover:bg-amber-dark">
          Start a future vault →
        </span>
      </div>
    </Link>
  );
}

/**
 * Shared Gift card — secondary, cool-toned. "Collect messages.
 * Create a gift." Links to the capsule path.
 */
function SharedGiftCard() {
  return (
    <Link
      href="/sign-up?path=capsule"
      aria-label="Create a shared gift"
      className="group relative flex flex-col rounded-[20px] border-[1.5px] p-7 lg:p-8 transition-all duration-150 hover:-translate-y-[3px] hover:shadow-[0_8px_32px_rgba(15,31,61,0.12)]"
      style={{
        background: "#f0f4fa",
        borderColor: "rgba(15,31,61,0.1)",
        boxShadow: "0 4px 24px rgba(15,31,61,0.06)",
      }}
    >
      <SharedGiftVisual />

      <CardLabel icon={Gift} color="navy">
        Shared gift vault
      </CardLabel>
      <h3 className="text-[22px] font-extrabold text-navy tracking-[-0.5px] leading-[1.25]">
        Collect messages. Create a gift.
      </h3>
      <p className="text-[15px] text-ink-mid leading-[1.6]">
        Invite others to add letters, voice notes, photos, and videos.
        Perfect for birthdays, teachers, coaches, anniversaries,
        retirements, and special celebrations.
      </p>

      <ul className="space-y-2 mt-1">
        <Bullet icon={Users} color="navy">
          Invite friends &amp; family to contribute
        </Bullet>
        <Bullet icon={CalendarCheck} color="navy">
          Perfect for any special moment
        </Bullet>
        <Bullet icon={Sparkles} color="navy">
          One gift, many voices
        </Bullet>
      </ul>

      <div className="mt-auto pt-5">
        <span className="block w-full text-center bg-navy text-white font-bold text-[16px] py-3.5 px-6 rounded-[10px] transition-colors group-hover:bg-navy-mid">
          Create a shared gift →
        </span>
      </div>
    </Link>
  );
}

// ───── Shared primitives ─────────────────────────────────────

function CardLabel({
  icon: Icon,
  color,
  children,
}: {
  icon: LucideIcon;
  color: "amber" | "navy";
  children: React.ReactNode;
}) {
  const klass =
    color === "amber"
      ? "text-amber"
      : "text-navy";
  return (
    <div
      className={`inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.14em] uppercase ${klass}`}
    >
      <Icon size={14} strokeWidth={1.5} aria-hidden="true" />
      {children}
    </div>
  );
}

function Bullet({
  icon: Icon,
  color,
  children,
}: {
  icon: LucideIcon;
  color: "amber" | "navy";
  children: React.ReactNode;
}) {
  const iconClass = color === "amber" ? "text-amber" : "text-navy";
  return (
    <li className="flex items-center gap-2 text-[15px] text-ink-mid leading-[1.5]">
      <Icon
        size={16}
        strokeWidth={1.5}
        aria-hidden="true"
        className={`shrink-0 ${iconClass}`}
      />
      {children}
    </li>
  );
}

// ───── Illustrative card visuals ─────────────────────────────
//
// Pure CSS/HTML compositions — no external images. Each visual is
// a ~200–220px tall container with absolutely-positioned children:
// a handwritten letter/envelope, a warm photo placeholder, and a
// voice-note pill. Values are hand-tuned to match the designer's
// layered feel rather than tracking a strict grid.

function FutureVaultVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative h-[220px] mb-6 -mx-1 select-none pointer-events-none"
    >
      {/* Letter card — cream, rotated -2deg, handwritten text. */}
      <div
        className="absolute left-2 top-2 w-[200px] p-4 rounded-lg bg-white"
        style={{
          transform: "rotate(-2deg)",
          boxShadow: "0 6px 20px rgba(15,31,61,0.08)",
          border: "1px solid rgba(15,31,61,0.04)",
        }}
      >
        <p
          className="text-[12px] text-navy leading-[1.55] italic"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          To Ellie,
          <br />
          I hope you always know
          <br />
          how deeply you&rsquo;re loved.
          <br />
          I believe in you more
          <br />
          than you know&hellip;
        </p>
        <p
          className="text-[13px] text-amber mt-2"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          ♡
        </p>
      </div>

      {/* Warm photo placeholder — amber/gold gradient, rotated +3deg. */}
      <div
        className="absolute right-2 top-6 w-[120px] h-[90px] rounded-lg"
        style={{
          transform: "rotate(3deg)",
          background:
            "linear-gradient(135deg, #f4c47a 0%, #e09a5a 55%, #c47a3a 100%)",
          boxShadow: "0 6px 20px rgba(196,122,58,0.2)",
          border: "3px solid #ffffff",
        }}
      />

      {/* Voice-note pill — centred bottom. */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-0">
        <WaveformDisplay duration="2:34" color="#c47a3a" />
      </div>
    </div>
  );
}

function SharedGiftVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative h-[220px] mb-6 -mx-1 select-none pointer-events-none"
    >
      {/* Envelope / card — sage/olive tint, rotated -1deg. */}
      <div
        className="absolute left-2 top-4 w-[180px] h-[110px] rounded-lg flex items-center justify-center px-4"
        style={{
          transform: "rotate(-1deg)",
          background: "linear-gradient(135deg, #e6ebd8 0%, #c7cfa8 100%)",
          boxShadow: "0 6px 20px rgba(15,31,61,0.06)",
          border: "1px solid rgba(15,31,61,0.05)",
        }}
      >
        <p
          className="text-[12px] text-navy/80 leading-[1.4] italic text-center"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          Thank you for
          <br />
          believing in us!
        </p>
      </div>

      {/* Sticky note — yellow/warm, rotated +2deg, overlapping. */}
      <div
        className="absolute left-[120px] top-0 w-[120px] h-[88px] p-3 rounded-sm"
        style={{
          transform: "rotate(2deg)",
          background: "linear-gradient(135deg, #fff3b5 0%, #ffe88a 100%)",
          boxShadow: "0 6px 18px rgba(15,31,61,0.1)",
        }}
      >
        <p
          className="text-[12px] text-navy leading-[1.4]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          You made a
          <br />
          difference!
        </p>
        <p
          className="text-[13px] text-amber mt-1"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          ♡
        </p>
      </div>

      {/* Cool photo placeholder with jersey-number overlay. */}
      <div
        className="absolute right-2 top-[58px] w-[120px] h-[90px] rounded-lg flex items-center justify-center"
        style={{
          transform: "rotate(-3deg)",
          background:
            "linear-gradient(135deg, #5b7199 0%, #3c4a6b 55%, #2c3a5a 100%)",
          boxShadow: "0 6px 20px rgba(15,31,61,0.22)",
          border: "3px solid #ffffff",
        }}
      >
        <p
          className="text-white/85 font-bold tracking-[0.18em] text-[13px]"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          13 | 13 | 22 | 22
        </p>
      </div>

      {/* Voice-note pill — bottom, navy-toned for this card. */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-0">
        <WaveformDisplay duration="1:18" color="#4a5568" />
      </div>
    </div>
  );
}
