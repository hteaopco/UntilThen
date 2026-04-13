function MockBtn({
  children,
  italic,
  ariaLabel,
}: {
  children: React.ReactNode;
  italic?: boolean;
  ariaLabel?: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={`w-[26px] h-[26px] bg-white rounded-md flex items-center justify-center text-[11px] font-bold text-ink-mid border border-navy/[0.08] ${
        italic ? "italic" : ""
      }`}
    >
      {children}
    </button>
  );
}

function MockEditor() {
  return (
    <div className="bg-white rounded-xl p-5 border border-navy/[0.08] shadow-[0_4px_20px_rgba(15,31,61,0.1)]">
      <div className="flex gap-1.5 mb-3 pb-3 border-b border-navy/[0.08]">
        <MockBtn>B</MockBtn>
        <MockBtn italic>I</MockBtn>
        <MockBtn ariaLabel="Add photo">📷</MockBtn>
        <MockBtn ariaLabel="Record voice note">🎙</MockBtn>
      </div>
      <div className="text-[13px] leading-[1.8] text-ink-mid">
        Dear Ellie,
        <br />
        <br />
        It&rsquo;s raining and you just fell asleep on my chest. You&rsquo;re
        two weeks old. I want to remember this exact weight.
        <span
          aria-hidden="true"
          className="inline-block w-[2px] h-[14px] bg-sky align-middle ml-px animate-blink"
        />
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-navy/[0.08]">
        <div className="text-[11px] font-bold text-gold flex items-center gap-1">
          <span aria-hidden="true">🔒</span>
          Unlocks age 18
        </div>
        <button
          type="button"
          className="bg-navy text-white text-[11px] font-bold px-3.5 py-1.5 rounded-md hover:bg-navy-mid transition-colors"
        >
          Seal →
        </button>
      </div>
    </div>
  );
}

function FeatureBadge({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={`inline-block text-[10px] font-bold tracking-[0.12em] uppercase text-sky px-2.5 py-1 rounded-md mb-3.5 ${
        dark ? "bg-sky/15" : "bg-sky-tint"
      }`}
    >
      {children}
    </span>
  );
}

function SimpleFeature({
  badge,
  title,
  body,
}: {
  badge: string;
  title: string;
  body: string;
}) {
  return (
    <div className="bg-white p-9 rounded-2xl border border-navy/[0.08] hover:border-sky/25 hover:shadow-[0_8px_24px_rgba(15,31,61,0.06)] transition-all">
      <FeatureBadge>{badge}</FeatureBadge>
      <h3 className="text-[19px] font-bold text-navy mb-2.5 tracking-[-0.3px] leading-[1.2]">
        {title}
      </h3>
      <p className="text-sm leading-[1.75] text-ink-mid">{body}</p>
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="bg-white">
      <div className="mx-auto max-w-[1280px] px-6 lg:px-14 py-16 lg:py-24">
        <p className="text-[11px] font-bold tracking-[0.16em] uppercase text-sky mb-3.5">
          Features
        </p>
        <h2 className="text-[clamp(30px,3.5vw,46px)] font-extrabold tracking-[-1.5px] leading-[1.08] text-navy mb-16 max-w-[520px]">
          Everything you need to
          <br />
          write{" "}
          <span className="font-light italic text-sky">across time.</span>
        </h2>

        <div className="grid gap-4 lg:gap-5 lg:grid-cols-2">
          {/* Featured: navy bg, full width */}
          <div className="lg:col-span-2 bg-navy p-9 rounded-2xl border border-navy grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <FeatureBadge dark>Writing Experience</FeatureBadge>
              <h3 className="text-[19px] font-bold text-white mb-2.5 tracking-[-0.3px] leading-[1.2]">
                A letter editor built for emotion, not productivity.
              </h3>
              <p className="text-sm leading-[1.75] text-white/55 font-light">
                No clutter, no distractions. A quiet space to write freely —
                with rich text, photo inserts, and an AI prompt when
                you&rsquo;re stuck.
              </p>
            </div>
            <MockEditor />
          </div>

          <SimpleFeature
            badge="Voice Notes"
            title="Some things are better heard than read."
            body="Record a voice note directly in the app. Your child won't just read your words — they'll hear your actual voice from across the years."
          />
          <SimpleFeature
            badge="Multi-Contributor"
            title="Invite grandparents, godparents & family."
            body="Build a vault that holds a whole village of love. Each contributor writes privately — every voice in your child's life, in one place."
          />
          <SimpleFeature
            badge="Smart Prompts"
            title="Never stare at a blank page."
            body="Weekly prompts nudge you to write. Milestone reminders make sure no birthday passes unwritten."
          />
          <SimpleFeature
            badge="The Reveal"
            title="Entries unlock one by one, like gifts."
            body="On the reveal date your child's vault opens — letters arriving in sequence. Each entry a discovery."
          />
        </div>
      </div>
    </section>
  );
}
