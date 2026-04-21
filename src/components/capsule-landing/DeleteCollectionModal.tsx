"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";

type SiblingOption = { id: string; title: string };

type Props = {
  collectionId: string;
  collectionTitle: string;
  childId: string;
  entryCount: number;
  siblings: SiblingOption[];
  onClose: () => void;
};

type Plan = "move" | "delete-all";

const MAIN_DIARY_VALUE = "__main_diary__";

/**
 * Destructive action modal for a real Collection. The user picks one
 * of two outcomes for the memories sitting inside:
 *
 *   - Move them to another collection (defaults to Main Capsule
 *     Diary = collectionId null). Submits DELETE with moveEntriesTo.
 *   - Delete them alongside the collection. Submits DELETE with
 *     deleteEntries:true.
 *
 * On success → router.push to the vault landing + refresh.
 */
export function DeleteCollectionModal({
  collectionId,
  collectionTitle,
  childId,
  entryCount,
  siblings,
  onClose,
}: Props) {
  const router = useRouter();
  const [plan, setPlan] = useState<Plan>(entryCount > 0 ? "move" : "delete-all");
  const [target, setTarget] = useState<string>(MAIN_DIARY_VALUE);
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
    setSaving(true);
    setError(null);
    try {
      const body =
        plan === "delete-all"
          ? { deleteEntries: true }
          : {
              moveEntriesTo:
                target === MAIN_DIARY_VALUE ? null : target,
            };
      const res = await fetch(`/api/collections/${collectionId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Couldn't delete the collection.");
      }
      router.push(`/vault/${childId}`);
      router.refresh();
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
          <h2 className="text-[17px] font-bold text-navy tracking-[-0.2px] flex items-center gap-2">
            <AlertTriangle size={17} strokeWidth={1.75} className="text-red-600" />
            Delete &ldquo;{collectionTitle}&rdquo;?
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
            <p className="text-[13px] text-ink-mid leading-[1.5]">
              {entryCount === 0
                ? "This collection is empty — deleting it only removes the wrapper."
                : `What should happen to the ${entryCount} ${entryCount === 1 ? "memory" : "memories"} inside?`}
            </p>

            {entryCount > 0 && (
              <>
                <label className="flex items-start gap-3 rounded-xl border border-navy/10 bg-white px-4 py-3 cursor-pointer hover:border-amber/40 has-[:checked]:border-amber has-[:checked]:bg-amber-tint/30 transition-colors">
                  <input
                    type="radio"
                    name="plan"
                    value="move"
                    checked={plan === "move"}
                    onChange={() => setPlan("move")}
                    className="mt-1 accent-amber"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-navy">
                      Move memories to another collection
                    </div>
                    <div className="text-[12px] text-ink-mid mt-0.5">
                      The memories stay in the vault, just regrouped.
                    </div>
                    <select
                      value={target}
                      onChange={(e) => {
                        setPlan("move");
                        setTarget(e.target.value);
                      }}
                      disabled={plan !== "move" || saving}
                      className="mt-2 w-full px-3 py-1.5 rounded-lg border border-navy/15 bg-white text-[13px] text-navy outline-none focus:border-amber focus:ring-2 focus:ring-amber/20 disabled:opacity-50"
                    >
                      <option value={MAIN_DIARY_VALUE}>Main Capsule Diary</option>
                      {siblings.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-xl border border-navy/10 bg-white px-4 py-3 cursor-pointer hover:border-red-300 has-[:checked]:border-red-400 has-[:checked]:bg-red-50/50 transition-colors">
                  <input
                    type="radio"
                    name="plan"
                    value="delete-all"
                    checked={plan === "delete-all"}
                    onChange={() => setPlan("delete-all")}
                    className="mt-1 accent-red-600"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold text-navy">
                      Delete the memories too
                    </div>
                    <div className="text-[12px] text-red-700 mt-0.5">
                      Can&rsquo;t be undone — everything inside this collection
                      will be erased.
                    </div>
                  </div>
                </label>
              </>
            )}

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
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-[13px] font-bold hover:bg-red-700 transition-colors disabled:opacity-60"
            >
              {saving ? "Deleting…" : "Delete collection"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
