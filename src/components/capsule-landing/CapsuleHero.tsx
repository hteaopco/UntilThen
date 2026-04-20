import { Layers, Lock, ShoppingBag } from "lucide-react";

type Props = {
  childId: string;
  childFirstName: string;
  vaultCoverUrl: string | null;
};

/**
 * Top-of-page hero for the capsule landing. Two layouts behind a
 * responsive breakpoint:
 *
 * Mobile (<sm): the title now lives in the page header, so the hero
 *   here is just the cover image followed by the "Create One /
 *   Create Multiple" toggle row. Description copy is intentionally
 *   dropped on mobile to keep the top of the page compact.
 *
 * Desktop (sm+): full hero — cover left, title + description + toggle
 *   stacked on the right.
 */
export function CapsuleHero({
  childId: _childId,
  childFirstName,
  vaultCoverUrl,
}: Props) {
  return (
    <section>
      {/* Mobile: toggle cards first, then image. */}
      <div className="sm:hidden space-y-5">
        <CreateModeToggle />
        <CapsuleCover vaultCoverUrl={vaultCoverUrl} />
      </div>

      {/* Desktop: horizontal hero unchanged. */}
      <div className="hidden sm:flex gap-8 items-start">
        <div className="shrink-0 w-[260px] md:w-[300px]">
          <CapsuleCover vaultCoverUrl={vaultCoverUrl} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-[40px] md:text-[44px] font-extrabold text-navy tracking-[-0.5px] leading-[1.08]">
            {childFirstName}&rsquo;s
            <br />
            Time Capsule{" "}
            <span className="font-brush text-amber align-baseline">♡</span>
          </h1>
          <p className="mt-3 text-[16px] text-ink-mid leading-[1.5] max-w-[420px]">
            Capture the moments, memories and milestones that make{" "}
            {childFirstName}, {childFirstName}.
          </p>
          <CreateModeToggle />
        </div>
      </div>
    </section>
  );
}

function CapsuleCover({ vaultCoverUrl }: { vaultCoverUrl: string | null }) {
  return (
    <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-amber/60 shadow-[0_8px_24px_-8px_rgba(196,122,58,0.2)] bg-white">
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
  );
}

function CreateModeToggle() {
  return (
    <div className="sm:mt-5 rounded-2xl border border-amber/25 bg-white/70 p-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <ToggleCard
        icon={<ShoppingBag size={22} strokeWidth={1.75} />}
        title="Create One Collection"
        body="A single collection to be opened on a special day."
      />
      <ToggleCard
        icon={<Layers size={22} strokeWidth={1.75} />}
        title="Create Multiple Collections"
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
