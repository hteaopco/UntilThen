"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { inferCollectionIcon } from "@/components/collections/CollectionCover";
import { RevealDatePicker } from "@/components/ui/RevealDatePicker";
import { formatShort } from "@/lib/dateFormatters";

export function CreateCollectionModal({
  vaultId,
  vaultRevealDate,
  childFirstName,
  childDateOfBirth,
  onClose,
}: {
  vaultId: string;
  vaultRevealDate: string | null;
  childFirstName: string;
  childDateOfBirth: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dateMode, setDateMode] = useState<"vault" | "custom">("vault");
  const [customDate, setCustomDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  // Preview icon as the parent types. "new memories" is a safe
  // placeholder seed so an empty title still shows a neutral book.
  const PreviewIcon = inferCollectionIcon(title || "new memories");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    if (dateMode === "custom" && !customDate) {
      setError("Pick a date or switch back to the vault default.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaultId,
          title: title.trim(),
          description: description.trim() || null,
          // Icons are now inferred from the title on display.
          // Leave coverEmoji null for new collections.
          coverEmoji: null,
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
            className="text-ink-mid hover:text-navy transition-colors"
            aria-label="Close"
          >
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <div className="px-7 py-6 space-y-5">
          {/* Live-preview cover — the icon updates automatically as
              the title is typed. No emoji picker required. */}
          <div className="flex items-center gap-3 rounded-xl bg-warm-surface px-4 py-3">
            <div className="shrink-0 w-12 h-12 rounded-xl bg-white border border-amber/20 flex items-center justify-center">
              <PreviewIcon
                size={22}
                strokeWidth={1.5}
                className="text-amber"
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-ink-mid">
                Cover
              </div>
              <div className="text-sm text-ink-mid italic">
                Updates automatically from your title.
              </div>
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
              className="account-input"
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
              className="account-input"
            />
          </div>

          <div>
            <Label>Unlock date</Label>
            <div className="space-y-3">
              <label className="flex items-start gap-2 text-sm text-ink-mid cursor-pointer">
                <input
                  type="radio"
                  name="dateMode"
                  value="vault"
                  checked={dateMode === "vault"}
                  onChange={() => setDateMode("vault")}
                  className="mt-1 accent-amber"
                />
                <span>
                  <span className="font-medium text-navy">
                    Vault date
                    {vaultRevealDate
                      ? ` — ${formatShort(vaultRevealDate)}`
                      : ""}
                  </span>
                  <span className="text-ink-light italic ml-1">(default)</span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm text-ink-mid cursor-pointer">
                <input
                  type="radio"
                  name="dateMode"
                  value="custom"
                  checked={dateMode === "custom"}
                  onChange={() => setDateMode("custom")}
                  className="mt-1 accent-amber"
                />
                <span className="font-medium text-navy">
                  Choose a different date
                </span>
              </label>

              {dateMode === "custom" && (
                <div className="ml-6">
                  <RevealDatePicker
                    value={customDate}
                    onChange={setCustomDate}
                    childFirstName={childFirstName}
                    childDateOfBirth={childDateOfBirth}
                    disabled={saving}
                  />
                </div>
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
            className="inline-flex items-center gap-2 bg-amber text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
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
