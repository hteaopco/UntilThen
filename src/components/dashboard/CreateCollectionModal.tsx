"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

const EMOJI_PRESETS = ["📖", "⚽", "💙", "🎵", "🌟", "✈️", "🎨", "📷"];

export function CreateCollectionModal({
  vaultRevealDate,
  onClose,
}: {
  vaultRevealDate: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState<string>(EMOJI_PRESETS[0]!);
  const [customEmoji, setCustomEmoji] = useState("");
  const [dateMode, setDateMode] = useState<"vault" | "custom">("vault");
  const [customDate, setCustomDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  const effectiveEmoji = customEmoji.trim() || emoji;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          coverEmoji: effectiveEmoji || null,
          revealDate: dateMode === "custom" ? customDate || null : null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't create collection.");
      }
      const json = (await res.json()) as { id?: string };
      onClose();
      if (json.id) router.push(`/dashboard/collection/${json.id}`);
      else router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-[0_24px_48px_-8px_rgba(15,31,61,0.4)] w-full max-w-[520px] max-h-[92vh] overflow-y-auto"
      >
        <div className="px-7 py-6 border-b border-navy/[0.08] flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-navy tracking-[-0.3px]">
              Create a Collection
            </h2>
            <p className="mt-1 text-sm text-ink-mid leading-[1.5]">
              A Collection groups multiple entries into one sealed book. Your
              child opens it like a journal — reading each entry in order, all
              on the same reveal date.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-mid hover:text-navy transition-colors text-xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="px-7 py-6 space-y-5">
          <div>
            <Label>Choose an emoji</Label>
            <div className="flex flex-wrap items-center gap-2">
              {EMOJI_PRESETS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    setEmoji(e);
                    setCustomEmoji("");
                  }}
                  className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xl transition-all ${
                    !customEmoji && emoji === e
                      ? "border-navy bg-amber-tint"
                      : "border-navy/10 hover:border-navy/30"
                  }`}
                  aria-label={`Use ${e}`}
                >
                  {e}
                </button>
              ))}
              <input
                type="text"
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value)}
                placeholder="or type"
                maxLength={8}
                className="w-24 px-3 py-2 border border-navy/15 rounded-lg text-sm text-navy outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
              />
            </div>
          </div>

          <div>
            <Label required>Collection title</Label>
            <input
              ref={firstFieldRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Early Years Journal"
              disabled={saving}
              required
              className="w-full px-4 py-2.5 text-sm text-navy bg-white border border-navy/15 rounded-lg outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 disabled:opacity-50"
            />
          </div>

          <div>
            <Label>Description</Label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Random notes from the early years"
              disabled={saving}
              className="w-full px-4 py-2.5 text-sm text-navy bg-white border border-navy/15 rounded-lg outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 disabled:opacity-50"
            />
          </div>

          <div>
            <Label>Unlock date</Label>
            <div className="space-y-2">
              <label className="flex items-start gap-2 text-sm text-ink-mid cursor-pointer">
                <input
                  type="radio"
                  name="dateMode"
                  value="vault"
                  checked={dateMode === "vault"}
                  onChange={() => setDateMode("vault")}
                  className="mt-1 accent-navy"
                />
                <span>
                  <span className="font-medium text-navy">
                    Vault date
                    {vaultRevealDate
                      ? ` — ${new Date(vaultRevealDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                      : ""}
                  </span>
                  <span className="text-ink-light italic ml-1">(default)</span>
                </span>
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-mid cursor-pointer">
                <input
                  type="radio"
                  name="dateMode"
                  value="custom"
                  checked={dateMode === "custom"}
                  onChange={() => setDateMode("custom")}
                  className="accent-navy"
                />
                <span className="font-medium text-navy">
                  Choose a different date
                </span>
              </label>
              {dateMode === "custom" && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  min={new Date(Date.now() + 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0]}
                  className="ml-6 px-3 py-2 border border-navy/15 rounded-lg text-sm text-navy outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
                />
              )}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="px-7 py-4 border-t border-navy/[0.08] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-ink-mid hover:text-navy transition-colors px-3 py-2"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!title.trim() || saving}
            className="bg-navy text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-navy-mid transition-colors disabled:opacity-60"
          >
            {saving ? "Creating…" : "Create Collection →"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="block text-[11px] font-bold tracking-[0.1em] uppercase text-ink-mid mb-2">
      {children}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>
  );
}
