"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ChildDangerZone({
  childId,
  firstName,
}: {
  childId: string;
  firstName: string;
}) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    if (deleteText.trim().toLowerCase() !== firstName.trim().toLowerCase()) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/account/children/${childId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Couldn't delete capsule.");
      }
      router.push("/account/capsules");
      router.refresh();
    } catch (err) {
      window.alert((err as Error).message);
      setDeleting(false);
    }
  }

  return (
    <section>
      <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-red-600 mb-3">
        Danger zone
      </p>
      <p className="text-sm text-ink-mid max-w-[520px] mb-5">
        Deleting this capsule permanently removes all entries written for{" "}
        {firstName}. This cannot be undone.
      </p>

      {!deleteOpen ? (
        <button type="button" onClick={() => setDeleteOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border-[1.5px] border-red-600 text-red-600 text-sm font-bold hover:bg-red-50 transition-colors">
          <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
          Delete this capsule
        </button>
      ) : (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-5 max-w-[520px]">
          <p className="text-sm text-red-800 font-semibold mb-2">Are you absolutely sure?</p>
          <p className="text-sm text-red-700/90 mb-4 leading-[1.5]">
            Type <strong>{firstName}</strong>&rsquo;s name below to confirm.
          </p>
          <input type="text" value={deleteText} onChange={(e) => setDeleteText(e.target.value)}
            placeholder={firstName} className="account-input bg-white border-red-300 mb-4" autoFocus />
          <div className="flex items-center gap-3">
            <button type="button" onClick={confirmDelete}
              disabled={deleteText.trim().toLowerCase() !== firstName.trim().toLowerCase() || deleting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors disabled:opacity-50">
              <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
              {deleting ? "Deleting\u2026" : "Delete capsule"}
            </button>
            <button type="button" onClick={() => { setDeleteOpen(false); setDeleteText(""); }} disabled={deleting}
              className="text-sm font-semibold text-ink-mid hover:text-navy px-2 py-2 disabled:opacity-50">Cancel</button>
          </div>
        </div>
      )}
    </section>
  );
}
