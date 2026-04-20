import { Layers, Lock, ShoppingBag } from "lucide-react";

type Props = {
  childId: string;
  childFirstName: string;
  vaultCoverUrl: string | null;
};

/**
 * Top-of-page hero for the capsule landing. Square cover image on the
 * left (stacked on mobile), title + description on the right, and a
 * two-up toggle card below the description for the "one vs many"
 * capsule onboarding choice. The toggle is visual-only for now — both
 * options lead to the same Collection creation flow.
 */
export function CapsuleHero({
  childId: _childId,
  childFirstName,
  vaultCoverUrl,
}: Props) {
  return (
    <section className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">
      <div className="relative shrink-0 w-full sm:w-[260px] md:w-[300px] aspect-square rounded-2xl overflow-hidden border border-amber/60 shadow-[0_8px_24px_-8px_rgba(196,122,58,0.2)] bg-white">
        {vaultCoverUrl ? (
          <img
            src={vaultCoverUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-br from-amber/25 via-cream to-gold/20"
          />
        )}
        <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm flex items-center justify-center shadow-[0_2px_8px_rgba(15,31,61,0.15)]">
          <Lock size={15} strokeWidth={2} className="text-amber" />
        </div>
      </div>

      <div className="flex-1 min-w-0 w-full">
        <h1 className="text-[32px] sm:text-[40px] md:text-[44px] font-extrabold text-navy tracking-[-0.5px] leading-[1.08]">
          {childFirstName}&rsquo;s
          <br />
          Time Capsule{" "}
          <span className="font-brush text-amber align-baseline">♡</span>
        </h1>
        <p className="mt-3 text-[15px] sm:text-[16px] text-ink-mid leading-[1.5] max-w-[420px]">
          Capture the moments, memories and milestones that make{" "}
          {childFirstName}, {childFirstName}.
        </p>

        <CreateModeToggle />
      </div>
    </section>
  );
}

function CreateModeToggle() {
  return (
    <div className="mt-5 rounded-2xl border border-amber/25 bg-white/70 p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <ToggleCard
        icon={<ShoppingBag size={22} strokeWidth={1.75} />}
        title="Create One Capsule"
        body="A single capsule to be opened on a special day."
      />
      <ToggleCard
        icon={<Layers size={22} strokeWidth={1.75} />}
        title="Create Multiple Capsules"
        body="Organize by milestones, years, or special moments."
      />
    </div>
  );
}

function ToggleCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl px-3 py-2.5">
      <span
        aria-hidden="true"
        className="shrink-0 w-10 h-10 rounded-lg bg-amber-tint text-amber flex items-center justify-center"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div className="text-[14px] font-bold text-navy tracking-[-0.2px]">
          {title}
        </div>
        <div className="text-[12px] text-ink-mid leading-[1.4] mt-0.5">
          {body}
        </div>
      </div>
    </div>
  );
}
