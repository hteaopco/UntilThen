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

// ── Cards ─────────────────────────────────────────────────────

function FutureVaultCard() {
  return (
    <div
      className="group relative flex flex-col rounded-[20px] border-[1.5px] p-7 lg:p-8 transition-all duration-150 hover:-translate-y-[3px] hover:shadow-[0_8px_32px_rgba(196,122,58,0.18)]"
      style={{
        background: "#fef6ec",
        borderColor: "rgba(196,122,58,0.2)",
        boxShadow: "0 4px 24px rgba(196,122,58,0.1)",
      }}
    >
      <CardSwipePanel
        defaultPanel={<FutureVaultVisual />}
        cards={TIME_CAPSULE_STACK}
      />

      <CardLabel icon={CalendarDays} color="amber">
        Time Capsule
      </CardLabel>
      <h3 className="text-[22px] font-extrabold text-navy tracking-[-0.5px] leading-[1.25]">
        Write now. They&rsquo;ll open later.
      </h3>
      <p className="text-[15px] text-ink-mid leading-[1.6]">
        A private capsule between you and one other person — letters,
        voice notes, photos, and videos they&rsquo;ll unlock on a
        birthday, graduation, or any milestone you choose.
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

function SharedGiftCard() {
  return (
    <div
      className="group relative flex flex-col rounded-[20px] border-[1.5px] p-7 lg:p-8 transition-all duration-150 hover:-translate-y-[3px] hover:shadow-[0_8px_32px_rgba(15,31,61,0.12)]"
      style={{
        background: "#f0f4fa",
        borderColor: "rgba(15,31,61,0.1)",
        boxShadow: "0 4px 24px rgba(15,31,61,0.06)",
      }}
    >
      <CardSwipePanel
        defaultPanel={<SharedGiftVisual />}
        cards={GIFT_CAPSULE_STACK}
        pills={GIFT_OCCASION_PILLS}
      />

      <CardLabel icon={Gift} color="navy">
        Gift Capsule
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
// The artwork for each card now comes from a designer-supplied PNG
// dropped into /public (write now.png, create gift.png). Previous
// CSS-composed letter / sticky / photo elements are gone — the
// images already contain the full composition.

function FutureVaultVisual() {
  return (
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
  );
}

function SharedGiftVisual() {
  return (
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
  );
}
