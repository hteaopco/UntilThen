import {
  Bold,
  Camera,
  Italic,
  Lock,
  Mic,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

function MockBtn({
  children,
  ariaLabel,
}: {
  children: React.ReactNode;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className="w-[26px] h-[26px] bg-white rounded-md flex items-center justify-center text-ink-mid border border-navy/[0.08]"
    >
      {children}
    </button>
  );
}

function MockEditor() {
  // Heavier shadow + subtle light ring so the editor reads as a floating
  // "product moment" against the dark warm-slate section.
  return (
    <div className="bg-white rounded-xl p-5 ring-1 ring-white/10 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.45),0_4px_12px_-4px_rgba(0,0,0,0.25)]">
      <div className="flex gap-1.5 mb-3 pb-3 border-b border-navy/[0.08]">
        <MockBtn ariaLabel="Bold">
          <Bold size={12} strokeWidth={1.75} />
        </MockBtn>
        <MockBtn ariaLabel="Italic">
          <Italic size={12} strokeWidth={1.75} />
        </MockBtn>
        <MockBtn ariaLabel="Add photo">
          <Camera size={12} strokeWidth={1.75} />
        </MockBtn>
        <MockBtn ariaLabel="Record voice note">
          <Mic size={12} strokeWidth={1.75} />
        </MockBtn>
      </div>
      <div className="text-[13px] leading-[1.8] text-ink-mid">
        Dear Ellie,
        <br />
        <br />
        It&rsquo;s raining and you just fell asleep on my chest. You&rsquo;re
        two weeks old. I want to remember this exact weight.
        <span
          aria-hidden="true"
          className="inline-block w-[2px] h-[14px] bg-amber align-middle ml-px animate-blink"
        />
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-navy/[0.08]">
        <div className="text-[11px] font-bold text-gold flex items-center gap-1.5">
          <Lock size={12} strokeWidth={1.75} aria-hidden="true" />
          Unlocks age 18
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 bg-amber text-white text-[11px] font-bold px-3.5 py-1.5 rounded-md hover:bg-amber-dark transition-colors"
        >
          <Lock size={12} strokeWidth={1.75} aria-hidden="true" />
          Seal
        </button>
      </div>
    </div>
  );
}

function FeatureBadge({
  children,
  dark,
}: {
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <span
      className={`inline-block text-[10px] font-bold tracking-[0.14em] uppercase px-2.5 py-1 rounded-md ${
        dark ? "bg-amber/20 text-amber-light" : "bg-amber-tint text-amber"
      }`}
    >
      {children}
    </span>
  );
}

function SimpleFeature({
  icon: Icon,
  badge,
  title,
  body,
  primary = false,
}: {
  icon: LucideIcon;
  badge: string;
  title: string;
  body: string;
  primary?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border transition-all ${
        primary
          ? "bg-amber-tint border-amber/20 p-10 lg:p-11 hover:border-amber/35 hover:shadow-[0_10px_30px_rgba(196,122,58,0.12)] shadow-[0_2px_18px_rgba(196,122,58,0.06)]"
          : "bg-white border-navy/[0.08] p-9 hover:border-amber/25 hover:shadow-[0_8px_24px_rgba(15,31,61,0.06)]"
      }`}
    >
      {/* Icon on the left, badge pushed to the right so they're
          not sitting on top of each other. */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div
          className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${
            primary ? "bg-white text-amber" : "bg-amber-tint text-amber"
          }`}
        >
          <Icon size={24} strokeWidth={1.5} aria-hidden="true" />
        </div>
        <FeatureBadge>{badge}</FeatureBadge>
      </div>
      <h3
        className={`font-bold text-navy mb-2.5 tracking-[-0.3px] leading-[1.2] ${
          primary ? "text-[21px]" : "text-[19px]"
        }`}
      >
        {title}
      </h3>
      <p className="text-sm leading-[1.75] text-ink-mid">{body}</p>
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="bg-cream">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-14 py-10 lg:py-24 space-y-4 lg:space-y-5">
        {/* Featured: dark gradient, full width */}
        <div
          className="rounded-2xl border border-white/5 p-9 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center"
          style={{
            background: "linear-gradient(180deg, #3a2e2a 0%, #2c2420 75%)",
          }}
        >
          <div>
            <div className="mb-3.5">
              <FeatureBadge dark>Writing Experience</FeatureBadge>
            </div>
            <h3 className="text-[19px] font-bold text-white mb-2.5 tracking-[-0.3px] leading-[1.2]">
              A quiet place to write what matters.
            </h3>
            <p className="text-sm leading-[1.75] text-white/75 font-light">
              No clutter, no distractions. A quiet space to write freely —
              with rich text, photo inserts, and an AI prompt when
              you&rsquo;re stuck.
            </p>
          </div>
          <MockEditor />
        </div>

        {/* Three supporting features, evenly weighted in a 3-col
            grid below the hero feature. Smart Prompts was cut
            here — it was a nice-to-have, not an emotional hook. */}
        <div className="grid gap-4 lg:gap-5 lg:grid-cols-3">
          <SimpleFeature
            icon={Mic}
            badge="Voice Notes"
            title="Some things are better heard than read."
            body="Record a voice note directly in the app. Your child won't just read your words — they'll hear your actual voice from across the years."
          />
          <SimpleFeature
            icon={Users}
            badge="Multi-Contributor"
            title="A whole life, from more than just you."
            body="Build a vault that holds a whole village of love. Each contributor writes privately — every voice in your child's life, in one place."
          />
          <SimpleFeature
            primary
            icon={Sparkles}
            badge="The Reveal"
            title="Memories unlock one by one, like gifts."
            body="On the reveal date your child's vault opens — letters arriving in sequence. Each one a discovery."
          />
        </div>
      </div>
    </section>
  );
}
