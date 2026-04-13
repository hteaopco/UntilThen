import type { ReactNode } from "react";

function FeatureCard({
  eyebrow,
  title,
  body,
  fullWidth,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  fullWidth?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={`bg-mist rounded-2xl p-8 lg:p-10 ${
        fullWidth ? "lg:col-span-2" : ""
      }`}
    >
      <div className="text-[11px] uppercase tracking-[0.25em] text-rust font-semibold">
        {eyebrow}
      </div>
      <h3 className="mt-4 text-2xl lg:text-3xl font-semibold text-ink tracking-[-0.01em] leading-tight max-w-lg">
        {title}
      </h3>
      <p className="mt-3 text-ink/60 leading-relaxed max-w-md">{body}</p>
      {children}
    </div>
  );
}

function MockEditor() {
  return (
    <div className="bg-cream rounded-xl border border-ink/[0.06] overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-ink/[0.06] flex items-center gap-3 text-ink/60 text-sm">
        <button type="button" className="hover:text-ink font-bold w-6">
          B
        </button>
        <button type="button" className="hover:text-ink italic w-6">
          I
        </button>
        <span className="w-px h-4 bg-ink/10 mx-1" />
        <button type="button" className="hover:text-ink" aria-label="Add photo">
          📷
        </button>
        <button type="button" className="hover:text-ink" aria-label="Record voice note">
          🎙
        </button>
      </div>
      <div className="p-6 text-ink/85 leading-relaxed text-[15px] min-h-[160px] font-serif">
        <p>Dear Ellie,</p>
        <p className="mt-3">
          It&rsquo;s raining and you just fell asleep on my chest
          <span
            aria-hidden="true"
            className="inline-block w-[2px] h-[17px] bg-ink/80 align-middle ml-0.5 animate-blink"
          />
        </p>
      </div>
      <div className="px-4 py-3 border-t border-ink/[0.06] flex items-center justify-between bg-cream/60">
        <div className="text-xs text-ink/55 flex items-center gap-1.5">
          <span aria-hidden="true">🔒</span>
          Unlocks age 18
        </div>
        <button
          type="button"
          className="bg-rust text-cream px-4 py-1.5 rounded-full text-xs font-medium hover:opacity-90 transition-opacity"
        >
          Seal letter →
        </button>
      </div>
    </div>
  );
}

export function Features() {
  return (
    <section id="features" className="py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-[11px] uppercase tracking-[0.25em] text-rust font-semibold">
          Features
        </p>
        <h2 className="mt-4 text-4xl lg:text-5xl font-extrabold text-ink tracking-[-0.02em] max-w-3xl leading-[1.1]">
          Everything you need to write{" "}
          <span className="font-light italic text-rust">across time.</span>
        </h2>

        <div className="mt-16 grid lg:grid-cols-2 gap-6">
          <FeatureCard
            fullWidth
            eyebrow="Writing Experience"
            title="A letter editor built for emotion, not productivity."
            body="A distraction-free space to say what matters — with room for voice, photos, and quiet pauses."
          >
            <div className="mt-8 grid lg:grid-cols-2 gap-10 items-start">
              <div className="text-ink/60 text-sm leading-relaxed">
                <p>
                  No word counts, no AI suggestions, no nudges. Just a page, a
                  cursor, and the person you&rsquo;re writing to.
                </p>
                <p className="mt-4">
                  Attach a voice note when the words don&rsquo;t cover it. Drop
                  in a photo from today. Seal it when you&rsquo;re ready.
                </p>
              </div>
              <MockEditor />
            </div>
          </FeatureCard>

          <FeatureCard
            eyebrow="Voice Notes"
            title="Some things are better heard than read."
            body="Record in-app. Your child hears your voice, exactly as it was — on a rainy Sunday, in a hospital room, the night before school."
          />
          <FeatureCard
            eyebrow="Multi-Contributor"
            title="Invite grandparents, godparents & family."
            body="Let the people who love them most contribute letters to the same vault. One reveal, many voices."
          />
          <FeatureCard
            eyebrow="Smart Prompts"
            title="Never stare at a blank page."
            body="Gentle prompts for every stage — first day of school, the scary year, the year you figured yourself out."
          />
          <FeatureCard
            eyebrow="The Reveal"
            title="Entries unlock one by one, like gifts."
            body="A guided, cinematic opening — not a dump of files. Each letter arrives when it&rsquo;s meant to."
          />
        </div>
      </div>
    </section>
  );
}
