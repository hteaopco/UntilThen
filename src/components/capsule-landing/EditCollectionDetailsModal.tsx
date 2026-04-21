"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { formatLong } from "@/lib/dateFormatters";

type Props = {
  collectionId: string;
  /** Reveal date of the parent vault (ISO string or null). Used to
   * clamp the max picker value — a collection can open earlier but
   * not later than the surrounding Time Capsule. */
  vaultRevealDate: string | null;
  initial: {
    title: string;
    description: string | null;
    revealDate: string | null;
  };
  onClose: () => void;
};

/**
 * Edit-mode companion to CreateCollectionModal: pre-populated with
 * the collection's current values, PATCHes /api/collections/{id}
 * with whatever the user changes, and calls router.refresh() so the
 * landing view picks up the new values. Cover-photo editing lives in
 * the separate CoverUploader flow triggered by the other pill.
 */
export function EditCollectionDetailsModal({
  collectionId,
  vaultRevealDate,
  initial,
  onClose,
}: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [revealDate, setRevealDate] = useState(
    initial.revealDate ? initial.revealDate.slice(0, 10) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Give the collection a name.");
      return;
    }
    if (revealDate && vaultRevealDate) {
      const picked = new Date(revealDate);
      const vault = new Date(vaultRevealDate);
      if (!Number.isNaN(picked.getTime()) && picked > vault) {
        setError(
          `Reveal date can't be after the vault's ${formatLong(vaultRevealDate)}.`,
        );
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/collections/${collectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmed,
          description: description.trim() || null,
          revealDate: revealDate || null,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Couldn't save changes.");
      }
      router.refresh();
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div className="w-full max-w-[520px] max-h-[94vh] flex flex-col bg-cream rounded-2xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] overflow-hidden">
        <header className="flex items-center justify-between px-5 py-4 border-b border-navy/5">
          <h2 className="text-[17px] font-bold text-navy tracking-[-0.2px]">
            Edit collection details
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-ink-mid hover:text-navy hover:bg-white transition-colors disabled:opacity-40"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <form onSubmit={submit} className="flex-1 overflow-y-auto">
          <div className="px-5 py-4 space-y-4">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] font-semibold text-ink-light mb-1">
                Name
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Birthday Celebrations"
                maxLength={80}
                autoFocus
                className="w-full px-3 py-2 rounded-lg border border-navy/15 bg-white text-[14px] text-navy placeholder-ink-light/50 outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] font-semibold text-ink-light mb-1">
                What is this collection about?
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Every birthday we've celebrated together…"
                rows={3}
                maxLength={400}
                className="w-full px-3 py-2 rounded-lg border border-navy/15 bg-white text-[14px] text-navy placeholder-ink-light/50 outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-[0.08em] font-semibold text-ink-light mb-1">
                Reveal date
                <span className="ml-2 font-normal normal-case tracking-normal text-ink-light/70 italic">
                  can be earlier than the vault, not later
                </span>
              </label>
              <input
                type="date"
                value={revealDate}
                onChange={(e) => setRevealDate(e.target.value)}
                max={vaultRevealDate ? vaultRevealDate.slice(0, 10) : undefined}
                className="w-full px-3 py-2 rounded-lg border border-navy/15 bg-white text-[14px] text-navy outline-none focus:border-amber focus:ring-2 focus:ring-amber/20"
              />
              {vaultRevealDate && (
                <p className="mt-1 text-[11px] text-ink-light italic">
                  Vault opens on {formatLong(vaultRevealDate)}.
                </p>
              )}
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[13px] text-red-700">
                {error}
              </div>
            )}
          </div>

          <footer className="px-5 py-4 border-t border-navy/5 flex items-center justify-end gap-2 bg-cream">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-lg border border-navy/10 text-[13px] font-semibold text-ink-mid hover:text-navy hover:border-navy/20 transition-colors disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-amber text-white text-[13px] font-bold hover:bg-amber-dark transition-colors disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
