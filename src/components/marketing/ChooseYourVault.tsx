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
import Image from "next/image";
import Link from "next/link";

import {
  CardSwipePanel,
  type StackCard,
} from "@/components/marketing/CardSwipePanel";

/**
 * "Choose your vault" — the two-path introduction between the hero
 * and the "How it works" section. Each card is a full-card swipe:
 * panel 0 is the original content (PNG + copy + CTA), panel 1 is
 * a fanned 3-card stack of example entries. Dots sit at the very
 * bottom of the card.
 */

// ── Example card data ─────────────────────────────────────────

const TIME_CAPSULE_STACK: StackCard[] = [
  {
    eyebrow: "To Ellie, age 18",
    title: "The night before your first day of school",
    preview:
      "You picked the backpack with tiny stars. I watched you pack it three times\u2026",
    badge: "Unlocks Sept 2038",
    badgeColor: "amber",
  },
  {
    eyebrow: "For when you fall in love",
    title: "A voice note from Dad",
    preview: "\uD83C\uDFA4 2:34 \u00B7 recorded on a rainy Sunday",
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

const GIFT_CAPSULE_STACK: StackCard[] = [
  {
    eyebrow: "Dad\u2019s 60th Birthday",
    title: "Happy birthday, Dad.",
    preview:
      "We all wrote you something. Open when you\u2019re ready\u2026",
    badge: "Sealed",
    badgeColor: "gold",
  },
  {
    eyebrow: "From Sarah \u00B7 Dad\u2019s 60th",
    title: "I still remember the fishing trips.",
    preview:
      "Every Sunday morning, without fail. That\u2019s the kind of dad you are.",
    badge: "Sealed",
    badgeColor: "gold",
  },
  {
    eyebrow: "From James & the kids \u00B7 Dad\u2019s 60th",
    title: "\uD83C\uDFA4 Voice note",
    preview: "1:18 \u00B7 recorded at the kitchen table",
    badge: "Sealed",
    badgeColor: "gold",
  },
];

const GIFT_OCCASION_PILLS = [
  "Birthdays",
  "Anniversaries",
  "Retirement",
  "Just Because",
];

// ── Section ───────────────────────────────────────────────────

export function ChooseYourVault() {
  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-14 pt-10 lg:pt-16 pb-10 lg:pb-24">
        {/* Header */}
        <div className="text-center max-w-[640px] mx-auto mb-12 lg:mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.12em] uppercase text-amber bg-amber-tint px-[14px] py-1.5 rounded-md mb-6">
            <span aria-hidden="true">✦</span>
            Start Something Meaningful
          </div>
          <h2 className="text-[clamp(30px,4vw,52px)] font-extrabold leading-[1.1] tracking-[-1.5px] text-navy">
            What will you create?
          </h2>
          <p className="mt-4 text-[18px] text-ink-mid leading-[1.55]">
            Two ways to save love.
            <br />
            Both last a lifetime.
          </p>
        </div>

        <div className="grid gap-5 sm:gap-8 lg:grid-cols-2 items-stretch max-w-[960px] mx-auto">
          {/* ── Time Capsule card ─────────────────────────── */}
          <div
            className="rounded-[20px] border-[1.5px] overflow-hidden"
            style={{
              background: "#fef6ec",
              borderColor: "rgba(196,122,58,0.2)",
              boxShadow: "0 4px 24px rgba(196,122,58,0.1)",
            }}
          >
            <CardSwipePanel
              cards={TIME_CAPSULE_STACK}
              defaultPanel={
                <div className="p-7 lg:p-8 flex flex-col">
                  <div className="mb-6 -mx-1 select-none pointer-events-none">
                    <Image
                      src="/write%20now.png"
                      alt=""
                      width={493}
                      height={343}
                      priority={false}
                      className="w-full h-auto"
                    />
                  </div>
                  <CardLabel icon={CalendarDays} color="amber">
                    Time Capsule
                  </CardLabel>
                  <h3 className="text-[18px] sm:text-[22px] font-extrabold text-navy tracking-[-0.5px] leading-[1.25]">
                    Write now. They&rsquo;ll open later.
                  </h3>
                  <p className="text-[15px] text-ink-mid leading-[1.6] mt-1">
                    A private capsule between you and one other person —
                    letters, voice notes, photos, and videos they&rsquo;ll
                    unlock on a birthday, graduation, or any milestone you
                    choose.
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
                      Start a Time Capsule
                    </Link>
                  </div>
                </div>
              }
            />
          </div>

          {/* ── Gift Capsule card ─────────────────────────── */}
          <div
            className="rounded-[20px] border-[1.5px] overflow-hidden"
            style={{
              background: "#f0f4fa",
              borderColor: "rgba(15,31,61,0.1)",
              boxShadow: "0 4px 24px rgba(15,31,61,0.06)",
            }}
          >
            <CardSwipePanel
              cards={GIFT_CAPSULE_STACK}
              pills={GIFT_OCCASION_PILLS}
              defaultPanel={
                <div className="p-7 lg:p-8 flex flex-col">
                  <div className="mb-6 -mx-1 select-none pointer-events-none">
                    <Image
                      src="/create%20gift.png"
                      alt=""
                      width={498}
                      height={328}
                      priority={false}
                      className="w-full h-auto"
                    />
                  </div>
                  <CardLabel icon={Gift} color="navy">
                    Gift Capsule
                  </CardLabel>
                  <h3 className="text-[18px] sm:text-[22px] font-extrabold text-navy tracking-[-0.5px] leading-[1.25]">
                    Collect messages. Create a gift.
                  </h3>
                  <p className="text-[15px] text-ink-mid leading-[1.6] mt-1">
                    Invite others to add letters, voice notes, photos, and
                    videos. Perfect for birthdays, teachers, coaches,
                    anniversaries, retirements, and special celebrations.
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
                  <div className="mt-auto pt-5">
                    <Link
                      href="/sign-up?path=capsule"
                      className="block w-full text-center bg-navy text-white font-bold text-[16px] py-3.5 px-6 rounded-[10px] transition-colors hover:bg-navy-mid"
                    >
                      Create a Gift Capsule
                    </Link>
                  </div>
                </div>
              }
            />
          </div>
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
    <li className="flex items-center gap-2 text-[15px] text-ink-mid leading-[1.5]">
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
