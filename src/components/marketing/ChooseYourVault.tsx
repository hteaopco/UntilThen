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

import {
  SwipeableExampleCards,
  type ExampleCard,
} from "@/components/marketing/SwipeableExampleCards";

/**
 * "Two ways to do it" — the two-path introduction between the hero
 * and the "How it works" section. Each card now contains an inner
 * swipeable stack of example entries so visitors immediately see
 * what the product feels like, before scrolling further.
 *
 * Product names
 *   Time Capsule  = private, one-to-one ($3.99/mo)
 *   Gift Capsule  = shared, multi-contributor ($9.99 one-time)
 */

// ── Example card data ─────────────────────────────────────────

const TIME_CAPSULE_EXAMPLES: ExampleCard[] = [
  {
    eyebrow: "To Ellie, age 18",
    title: "The night before your first day of school",
    preview:
      "You picked the backpack with tiny stars. I watched you pack it three times\u2026",
    badge: "Unlocks Sept 2038",
    badgeColor: "amber",
  },
  {
    eyebrow: "\uD83C\uDFA4 Voice note",
    title: "2:34 \u00B7 recorded on a rainy Sunday",
    badge: "Sealed",
    badgeColor: "gold",
  },
  {
    eyebrow: "Always",
    title: "The day we brought you home",
    preview: "\uD83D\uDCF7 47 photos \u00B7 with a letter",
    badge: "Sealed",
    badgeColor: "gold",
  },
];

const GIFT_CAPSULE_EXAMPLES: ExampleCard[] = [
  {
    eyebrow: "Dad\u2019s 60th Birthday",
    title: "Happy birthday, Dad.",
    preview:
      "We all wrote you something. Open when you\u2019re ready\u2026",
    badge: "Sealed",
    badgeColor: "gold",
  },
  {
    eyebrow: "From Sarah",
    title: "I still remember the fishing trips.",
    badge: "Sealed",
    badgeColor: "gold",
  },
  {
    eyebrow: "From James & the kids",
    title: "\uD83C\uDFA4 1:18 \u00B7 voice note",
    badge: "Sealed",
    badgeColor: "gold",
  },
];

// ── Section ───────────────────────────────────────────────────

export function ChooseYourVault() {
  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-14 py-20 lg:py-24">
        {/* Header */}
        <div className="text-center max-w-[640px] mx-auto mb-12 lg:mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.12em] uppercase text-amber bg-amber-tint px-[14px] py-1.5 rounded-md mb-6">
            <span aria-hidden="true">✦</span>
            Two ways to do it
          </div>
          <h2 className="text-[clamp(36px,4vw,52px)] font-extrabold leading-[1.1] tracking-[-1.5px] text-navy">
            What would you like to create?
          </h2>
        </div>

        <div className="grid gap-5 sm:gap-8 lg:grid-cols-2 items-stretch max-w-[960px] mx-auto">
          <TimeCapsuleCard />
          <GiftCapsuleCard />
        </div>

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

// ── Time Capsule card ─────────────────────────────────────────

function TimeCapsuleCard() {
  return (
    <div
      className="group relative flex flex-col rounded-[20px] border-[1.5px] p-7 lg:p-8 transition-all duration-150 hover:-translate-y-[3px] hover:shadow-[0_8px_32px_rgba(196,122,58,0.18)]"
      style={{
        background: "#fef6ec",
        borderColor: "rgba(196,122,58,0.2)",
        boxShadow: "0 4px 24px rgba(196,122,58,0.1)",
      }}
    >
      <SwipeableExampleCards
        cards={TIME_CAPSULE_EXAMPLES}
        colorScheme="amber"
      />

      <CardLabel icon={CalendarDays} color="amber">
        Time Capsule
      </CardLabel>
      <h3 className="text-[22px] font-extrabold text-navy tracking-[-0.5px] leading-[1.25]">
        Write now. They&rsquo;ll open it later.
      </h3>
      <p className="text-[15px] text-ink-mid leading-[1.6] mt-1.5">
        A private capsule between you and one other person — letters,
        voice notes, photos, and videos they&rsquo;ll unlock on a day
        you choose.
      </p>

      <ul className="space-y-2 mt-3">
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
        <Link
          href="/sign-up"
          className="block w-full text-center bg-amber text-white font-bold text-[16px] py-3.5 px-6 rounded-[10px] transition-colors hover:bg-amber-dark"
        >
          Start a Time Capsule →
        </Link>
      </div>
    </div>
  );
}

// ── Gift Capsule card ─────────────────────────────────────────

function GiftCapsuleCard() {
  return (
    <div
      className="group relative flex flex-col rounded-[20px] border-[1.5px] p-7 lg:p-8 transition-all duration-150 hover:-translate-y-[3px] hover:shadow-[0_8px_32px_rgba(15,31,61,0.12)]"
      style={{
        background: "#f0f4fa",
        borderColor: "rgba(15,31,61,0.1)",
        boxShadow: "0 4px 24px rgba(15,31,61,0.06)",
      }}
    >
      <SwipeableExampleCards
        cards={GIFT_CAPSULE_EXAMPLES}
        colorScheme="navy"
      />

      <CardLabel icon={Gift} color="navy">
        Gift Capsule
      </CardLabel>
      <h3 className="text-[22px] font-extrabold text-navy tracking-[-0.5px] leading-[1.25]">
        Collect messages. Give it together.
      </h3>
      <p className="text-[15px] text-ink-mid leading-[1.6] mt-1.5">
        Invite friends and family to contribute. Perfect for birthdays,
        celebrations, and moments that matter.
      </p>

      <ul className="space-y-2 mt-3">
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

      {/* Occasion tags */}
      <div className="flex flex-wrap gap-2 mt-4">
        {["Anniversaries", "Birthdays", "Retirement", "Just Because"].map(
          (tag) => (
            <span
              key={tag}
              className="text-[11px] font-semibold text-navy/70 bg-white border border-navy/10 px-2.5 py-1 rounded-full"
            >
              {tag}
            </span>
          ),
        )}
      </div>

      <div className="mt-auto pt-5">
        <Link
          href="/sign-up?path=capsule"
          className="block w-full text-center bg-navy text-white font-bold text-[16px] py-3.5 px-6 rounded-[10px] transition-colors hover:bg-navy-mid"
        >
          Create a Gift Capsule →
        </Link>
      </div>
    </div>
  );
}

// ── Shared primitives ─────────────────────────────────────────

function CardLabel({
  icon: Icon,
  color,
  children,
}: {
  icon: LucideIcon;
  color: "amber" | "navy";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`inline-flex items-center gap-1.5 text-[11px] font-bold tracking-[0.14em] uppercase ${
        color === "amber" ? "text-amber" : "text-navy"
      }`}
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
  return (
    <li
      className="flex items-center gap-2 text-[15px] text-ink-mid leading-[1.5]"
    >
      <Icon
        size={16}
        strokeWidth={1.5}
        aria-hidden="true"
        className={`shrink-0 ${color === "amber" ? "text-amber" : "text-navy"}`}
      />
      {children}
    </li>
  );
}
