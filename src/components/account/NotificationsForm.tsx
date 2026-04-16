"use client";

import { AlertCircle, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { formatLong } from "@/lib/dateFormatters";

type Prefs = {
  writingReminders: boolean;
  milestoneReminders: boolean;
  vaultAnniversary: boolean;
  contributorActivity: boolean;
  revealCountdown: boolean;
  pausedUntil: string | null;
};

type Toggle = {
  key: keyof Omit<Prefs, "pausedUntil">;
  label: string;
  description: string;
};

const TOGGLES: Toggle[] = [
  {
    key: "writingReminders",
    label: "Writing reminders",
    description: "Monthly nudge to add a new memory. Once per month maximum.",
  },
  {
    key: "milestoneReminders",
    label: "Milestone reminders",
    description:
      "Reminders before significant dates — first day of school, birthdays, etc.",
  },
  {
    key: "vaultAnniversary",
    label: "Vault anniversary",
    description: "Annual reminder of how long you've been writing.",
  },
  {
    key: "contributorActivity",
    label: "Contributor activity",
    description: "When a contributor adds or updates an entry.",
  },
  {
    key: "revealCountdown",
    label: "Reveal countdown",
    description: "Reminders at 6 months and 30 days before the reveal date.",
  },
];

export function NotificationsForm({ initial }: { initial: Prefs }) {
  const router = useRouter();
  const [prefs, setPrefs] = useState<Prefs>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paused = prefs.pausedUntil
    ? new Date(prefs.pausedUntil) > new Date()
    : false;

  async function savePrefs(next: Prefs) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/account/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't save preferences.");
      }
      setPrefs(next);
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2200);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function toggle(key: Toggle["key"]) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
  }

  const toggleKeys = TOGGLES.map((t) => t.key);
  const allOn = toggleKeys.every((k) => prefs[k]);

  function setAll(on: boolean) {
    const next = { ...prefs };
    for (const k of toggleKeys) next[k] = on;
    setPrefs(next);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    await savePrefs(prefs);
  }

  async function pauseFor(months: number) {
    const until = new Date();
    until.setMonth(until.getMonth() + months);
    await savePrefs({ ...prefs, pausedUntil: until.toISOString() });
  }

  async function unpause() {
    await savePrefs({ ...prefs, pausedUntil: null });
  }

  return (
    <form onSubmit={submit} className="space-y-10">
      <section>
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-3">
          Notifications
        </p>
        <h2 className="text-2xl font-extrabold text-navy tracking-[-0.3px] mb-2">
          Email preferences
        </h2>
        <p className="text-sm text-ink-mid">
          untilThen is a marathon, not a sprint — we&rsquo;ll never flood your
          inbox. Every reminder is here. Turn off what you don&rsquo;t want.
        </p>
      </section>

      {paused && prefs.pausedUntil && (
        <div className="rounded-xl border border-gold/40 bg-gold-tint px-5 py-4 flex items-start gap-3">
          <div className="flex-1">
            <div className="text-sm font-semibold text-navy">
              All reminders paused until {formatLong(prefs.pausedUntil)}.
            </div>
            <div className="text-xs text-ink-mid mt-1">
              You won&rsquo;t get any email from us until then.
            </div>
          </div>
          <button
            type="button"
            onClick={unpause}
            disabled={saving}
            className="text-[11px] uppercase tracking-[0.08em] font-bold text-amber hover:text-amber-dark disabled:opacity-50"
          >
            Resume now
          </button>
        </div>
      )}

      <section>
        <div className="flex items-center justify-end mb-3">
          <button
            type="button"
            onClick={() => setAll(!allOn)}
            disabled={saving}
            className="text-[12px] font-semibold text-amber hover:text-amber-dark transition-colors disabled:opacity-50"
          >
            {allOn ? "Turn all off" : "Turn all on"}
          </button>
        </div>
        <ul className="space-y-3">
          {TOGGLES.map((t) => (
            <li
              key={t.key}
              className="rounded-xl border border-navy/[0.08] bg-white px-5 py-4 flex items-start gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-navy">{t.label}</div>
                <div className="text-sm text-ink-mid mt-0.5">
                  {t.description}
                </div>
              </div>
              <Switch
                checked={prefs[t.key]}
                onChange={() => toggle(t.key)}
                ariaLabel={t.label}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="pt-6 border-t border-navy/[0.06]">
        <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber mb-3">
          Pause all reminders
        </p>
        <p className="text-sm text-ink-mid mb-4">
          Taking a break? Pause everything for a while. You can resume any time.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => pauseFor(3)}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-navy/15 text-sm font-semibold text-navy hover:border-navy transition-colors disabled:opacity-50"
          >
            Pause for 3 months
          </button>
          <button
            type="button"
            onClick={() => pauseFor(6)}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-navy/15 text-sm font-semibold text-navy hover:border-navy transition-colors disabled:opacity-50"
          >
            Pause for 6 months
          </button>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save preferences"}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-sage">
            <Check size={16} strokeWidth={2} aria-hidden="true" />
            Saved
          </span>
        )}
        {error && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
            <AlertCircle size={16} strokeWidth={1.75} aria-hidden="true" />
            {error}
          </span>
        )}
      </div>
    </form>
  );
}

function Switch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className={`shrink-0 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? "bg-amber" : "bg-navy/15"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
