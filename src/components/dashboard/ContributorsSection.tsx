"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { InviteModal } from "@/components/dashboard/InviteModal";

export type ContributorRow = {
  id: string;
  name: string | null;
  email: string;
  role: "FAMILY" | "FRIEND" | "TEACHER" | "OTHER";
  status: "PENDING" | "ACTIVE" | "REVOKED";
  requiresApproval: boolean;
};

const ROLE_LABEL: Record<ContributorRow["role"], string> = {
  FAMILY: "Family",
  FRIEND: "Friend",
  TEACHER: "Teacher",
  OTHER: "Other",
};

const STATUS_CLASS: Record<ContributorRow["status"], string> = {
  PENDING: "text-gold bg-gold-tint",
  ACTIVE: "text-green-700 bg-green-50",
  REVOKED: "text-ink-light bg-[#f1f5f9]",
};

export function ContributorsSection({
  contributors,
}: {
  contributors: ContributorRow[];
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  async function revoke(c: ContributorRow) {
    const displayName = c.name ?? c.email;
    if (
      !window.confirm(
        `Remove ${displayName}? Their submitted entries will remain in the vault.`,
      )
    ) {
      return;
    }
    setRemoving(c.id);
    try {
      await fetch(`/api/contributors/${c.id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setRemoving(null);
    }
  }

  return (
    <>
      <div className="mt-12 pt-8 border-t border-navy/[0.06] mb-10">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink-mid">
            Contributors · {contributors.length}
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-[11px] uppercase tracking-[0.08em] font-bold text-amber hover:text-navy transition-colors"
          >
            + Invite someone
          </button>
        </div>

        {contributors.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-navy/15 bg-warm-surface px-6 py-8 text-center">
            <p className="text-sm text-ink-mid">
              No contributors yet. Invite grandparents, godparents, or family
              to add memories alongside you.
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-4 bg-amber text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
            >
              Invite your first contributor
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {contributors.map((c) => (
              <li
                key={c.id}
                className="rounded-xl border border-navy/[0.08] bg-white px-5 py-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-navy">
                      {c.name ?? c.email}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.12em] font-bold text-ink-light">
                      {ROLE_LABEL[c.role]}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-[0.12em] font-bold px-2 py-0.5 rounded ${
                        STATUS_CLASS[c.status]
                      }`}
                    >
                      {c.status.toLowerCase()}
                    </span>
                    {c.requiresApproval && (
                      <span className="text-[10px] uppercase tracking-[0.12em] font-bold text-amber bg-amber-tint px-2 py-0.5 rounded">
                        👁 Review
                      </span>
                    )}
                  </div>
                  {c.name && (
                    <div className="text-xs text-ink-light mt-0.5 truncate">
                      {c.email}
                    </div>
                  )}
                </div>
                {c.status !== "REVOKED" && (
                  <button
                    type="button"
                    onClick={() => revoke(c)}
                    disabled={removing === c.id}
                    className="text-[11px] uppercase tracking-[0.08em] font-bold text-ink-light hover:text-red-600 transition-colors disabled:opacity-50"
                  >
                    {removing === c.id ? "…" : "Revoke"}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      {modalOpen && <InviteModal onClose={() => setModalOpen(false)} />}
    </>
  );
}
