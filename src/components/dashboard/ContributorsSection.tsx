"use client";

import {
  BookOpen,
  Eye,
  Heart,
  User,
  UserMinus,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
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

const ROLE_CONFIG: Record<
  ContributorRow["role"],
  { label: string; icon: LucideIcon }
> = {
  FAMILY: { label: "Family", icon: Heart },
  FRIEND: { label: "Friend", icon: Users },
  TEACHER: { label: "Teacher", icon: BookOpen },
  OTHER: { label: "Other", icon: User },
};

const STATUS_CLASS: Record<ContributorRow["status"], string> = {
  PENDING: "text-gold bg-gold-tint",
  ACTIVE: "text-green-700 bg-green-50",
  REVOKED: "text-ink-light bg-[#f1f5f9]",
};

export function ContributorsSection({
  contributors,
  vaultId,
  childFirstName,
}: {
  contributors: ContributorRow[];
  vaultId: string;
  childFirstName: string;
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
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="text-[11px] uppercase tracking-[0.12em] font-bold text-ink-mid">
            People adding to {childFirstName}&rsquo;s story ·{" "}
            {contributors.length}
          </div>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] font-bold text-amber hover:text-navy transition-colors"
          >
            <UserPlus size={14} strokeWidth={1.75} aria-hidden="true" />
            Invite someone
          </button>
        </div>

        {contributors.length === 0 ? (
          // Compact empty state — a single line. The big dashed
          // call-to-action was drawing too much eye away from the
          // writing spark at the top of the page.
          <div className="rounded-xl bg-warm-surface/60 border border-navy/[0.04] px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-ink-mid">
              No contributors yet — invite family to add memories alongside
              you.
            </p>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-[11px] uppercase tracking-[0.08em] font-bold text-amber hover:text-navy transition-colors"
            >
              Invite someone →
            </button>
          </div>
        ) : (
          <ul className="space-y-2">
            {contributors.map((c) => {
              const RoleIcon = ROLE_CONFIG[c.role].icon;
              return (
                <li
                  key={c.id}
                  className="rounded-xl border border-navy/[0.08] bg-white px-5 py-3 flex items-center gap-3"
                >
                  <div
                    aria-hidden="true"
                    className="shrink-0 w-9 h-9 rounded-full bg-amber-tint text-amber flex items-center justify-center"
                  >
                    <User size={16} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-navy">
                        {c.name ?? c.email}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] font-bold text-ink-light">
                        <RoleIcon
                          width={12}
                          height={12}
                          strokeWidth={1.75}
                          aria-hidden="true"
                        />
                        {ROLE_CONFIG[c.role].label}
                      </span>
                      <span
                        className={`text-[10px] uppercase tracking-[0.12em] font-bold px-2 py-0.5 rounded ${
                          STATUS_CLASS[c.status]
                        }`}
                      >
                        {c.status.toLowerCase()}
                      </span>
                      {c.requiresApproval && (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] font-bold text-amber bg-amber-tint px-2 py-0.5 rounded">
                          <Eye
                            size={12}
                            strokeWidth={1.75}
                            aria-hidden="true"
                          />
                          Review
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
                      className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] font-bold text-ink-light hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      <UserMinus
                        size={14}
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      {removing === c.id ? "…" : "Revoke"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {modalOpen && (
        <InviteModal
          vaultId={vaultId}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
