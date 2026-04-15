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
      className="relative h-[230px] mb-6 select-none pointer-events-none"
    >
      {/* Letter card — warm cream paper, handwritten script. Slightly
          larger and rotated more noticeably to match the mockup. */}
      <div
        className="absolute left-0 top-3 w-[210px] px-5 py-4 rounded-[10px]"
        style={{
          transform: "rotate(-4deg)",
          background: "linear-gradient(180deg, #fbf1e0 0%, #f5e4c8 100%)",
          boxShadow:
            "0 10px 24px rgba(15,31,61,0.12), 0 2px 6px rgba(15,31,61,0.05)",
          border: "1px solid rgba(120,80,30,0.08)",
        }}
      >
        <p
          className="text-[12px] text-navy/85 leading-[1.6] italic"
          style={{
            fontFamily:
              "var(--font-dancing-script), 'Snell Roundhand', 'Brush Script MT', cursive",
          }}
        >
          To Ellie,
          <br />
          I hope you always know
          <br />
          how deeply you&rsquo;re loved.
          <br />I believe in you more
          <br />
          than you know&hellip;
        </p>
        <p
          className="text-[14px] text-amber mt-2"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          ♡
        </p>
      </div>

      {/* Sunset-beach photo — built from layered CSS gradients (sky +
          water horizon) plus a small silhouette so it reads as a
          photograph instead of a plain gradient block. */}
      <div
        className="absolute right-0 top-8 w-[135px] h-[105px] rounded-[8px] overflow-hidden"
        style={{
          transform: "rotate(5deg)",
          boxShadow:
            "0 12px 26px rgba(196,122,58,0.28), 0 2px 6px rgba(15,31,61,0.08)",
          border: "3px solid #ffffff",
        }}
      >
        {/* Sky gradient: soft yellow → peach → amber horizon. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #ffe7b6 0%, #ffc98a 40%, #f0986f 75%, #c47a3a 100%)",
          }}
        />
        {/* Sun glow behind the figure. */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: "35%",
            width: "90%",
            height: "60%",
            background:
              "radial-gradient(ellipse at center, rgba(255,240,200,0.85) 0%, rgba(255,200,140,0) 70%)",
          }}
        />
        {/* Water strip at the bottom (cooler, reflects the sky). */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: "28%",
            background:
              "linear-gradient(180deg, #b87c4e 0%, #7a5440 60%, #5c3d2d 100%)",
          }}
        />
        {/* Figure silhouette — child with arms outstretched. */}
        <svg
          viewBox="0 0 40 60"
          className="absolute left-1/2 -translate-x-1/2"
          style={{ width: "28%", bottom: "20%" }}
        >
          <path
            d="M20 6 A3 3 0 1 0 20 12 A3 3 0 1 0 20 6 Z M20 13 L20 32 M20 17 L6 22 M20 17 L34 22 M20 32 L14 52 M20 32 L26 52"
            stroke="#2a1810"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="#2a1810"
          />
          {/* Small skirt/dress suggestion */}
          <path d="M13 30 L27 30 L24 40 L16 40 Z" fill="#2a1810" />
        </svg>
      </div>

      {/* Voice-note pill — small, tucked under the photo and
          overlapping the bottom edge. */}
      <div className="absolute right-3 bottom-2">
        <WaveformDisplay duration="2:34" color="#c47a3a" />
      </div>
    </div>
  );
}

function SharedGiftVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative h-[230px] mb-6 select-none pointer-events-none"
    >
      {/* Sage/olive envelope with a visible back flap. */}
      <div
        className="absolute left-0 top-5 w-[110px] h-[80px] rounded-[4px] overflow-hidden"
        style={{
          transform: "rotate(-5deg)",
          background: "linear-gradient(160deg, #dde1c6 0%, #bec4a3 100%)",
          boxShadow: "0 8px 20px rgba(15,31,61,0.1)",
          border: "1px solid rgba(90,100,60,0.18)",
        }}
      >
        {/* Triangular flap */}
        <div
          className="absolute inset-x-0 top-0"
          style={{
            height: "60%",
            background:
              "linear-gradient(180deg, #cfd5b4 0%, #aeb590 100%)",
            clipPath: "polygon(0 0, 100% 0, 50% 100%)",
          }}
        />
        {/* Seam line */}
        <div
          className="absolute inset-x-0"
          style={{
            top: "60%",
            height: "1px",
            background: "rgba(90,100,60,0.25)",
          }}
        />
      </div>

      {/* Big cream thank-you card / sticky — centre of composition. */}
      <div
        className="absolute left-[62px] top-0 w-[130px] h-[115px] px-4 py-4 rounded-[3px]"
        style={{
          transform: "rotate(-3deg)",
          background: "linear-gradient(180deg, #fdf1cf 0%, #f4e0a2 100%)",
          boxShadow:
            "0 10px 22px rgba(15,31,61,0.14), 0 2px 6px rgba(15,31,61,0.06)",
        }}
      >
        <p
          className="text-[13px] text-navy/85 leading-[1.5] italic"
          style={{
            fontFamily:
              "var(--font-dancing-script), 'Snell Roundhand', 'Brush Script MT', cursive",
          }}
        >
          Thank you
          <br />
          for believing
          <br />
          in us!
        </p>
        <p
          className="text-[14px] text-amber mt-1"
          style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
        >
          ♡
        </p>
      </div>

      {/* Smaller yellow sticky — overlaps the cream card to the right. */}
      <div
        className="absolute left-[178px] top-[62px] w-[108px] h-[78px] px-3 py-2.5 rounded-[2px]"
        style={{
          transform: "rotate(4deg)",
          background: "linear-gradient(180deg, #ffe486 0%, #f5c94a 100%)",
          boxShadow: "0 8px 18px rgba(15,31,61,0.14)",
        }}
      >
        <p
          className="text-[12px] text-navy/85 leading-[1.4] italic"
          style={{
            fontFamily:
              "var(--font-dancing-script), 'Snell Roundhand', 'Brush Script MT', cursive",
          }}
        >
          You made a<br />
          difference!
        </p>
      </div>

      {/* Team-in-jerseys photo — cool dusk gradient with four
          silhouetted figures in a row, jerseys numbered. */}
      <div
        className="absolute right-0 top-[30px] w-[140px] h-[105px] rounded-[8px] overflow-hidden"
        style={{
          transform: "rotate(4deg)",
          boxShadow:
            "0 12px 26px rgba(15,31,61,0.25), 0 2px 6px rgba(15,31,61,0.08)",
          border: "3px solid #ffffff",
        }}
      >
        {/* Sky gradient: soft amber horizon → dusk blue. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, #b9c8e0 0%, #8197b5 45%, #c48a5e 75%, #8a5a3a 100%)",
          }}
        />
        {/* Ground */}
        <div
          className="absolute inset-x-0 bottom-0"
          style={{
            height: "25%",
            background:
              "linear-gradient(180deg, #6b5237 0%, #3d2d1c 100%)",
          }}
        />
        {/* Four figures in a row with jersey numbers on their backs. */}
        <div
          className="absolute inset-x-0 flex justify-center items-end gap-[3px] px-2"
          style={{ bottom: "18%" }}
        >
          {["13", "13", "22", "22"].map((num, i) => (
            <div
              key={i}
              className="relative flex flex-col items-center"
              style={{ width: "20%" }}
            >
              {/* Head */}
              <div
                className="rounded-full"
                style={{
                  width: "55%",
                  aspectRatio: "1",
                  background: "#2a1a12",
                }}
              />
              {/* Jersey torso */}
              <div
                className="mt-[1px] w-full flex items-start justify-center pt-1"
                style={{
                  height: "34px",
                  background:
                    "linear-gradient(180deg, #f7f1e2 0%, #ded3b6 100%)",
                  clipPath:
                    "polygon(15% 0, 85% 0, 100% 18%, 100% 100%, 0 100%, 0 18%)",
                }}
              >
                <span
                  className="font-black text-navy/85 leading-none"
                  style={{ fontSize: "11px", letterSpacing: "-0.5px" }}
                >
                  {num}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Voice-note pill — tucked under the photo. */}
      <div className="absolute right-3 bottom-2">
        <WaveformDisplay duration="1:18" color="#4a5568" />
      </div>
    </div>
  );
}
