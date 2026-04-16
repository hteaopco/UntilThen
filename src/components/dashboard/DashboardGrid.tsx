import { Lock, PlusCircle, Sparkles } from "lucide-react";
import Link from "next/link";

import { NewVaultButton } from "@/components/dashboard/NewVaultButton";
import { formatLong } from "@/lib/dateFormatters";

export type DashboardVault = {
  childId: string;
  firstName: string;
  revealDate: string | null;
  momentsSealed: number;
};

export type DashboardCapsule = {
  id: string;
  title: string;
  occasionType:
    | "BIRTHDAY"
    | "ANNIVERSARY"
    | "RETIREMENT"
    | "GRADUATION"
    | "WEDDING"
    | "OTHER";
  revealDate: string;
  status: "DRAFT" | "ACTIVE" | "SEALED" | "REVEALED";
  contributorCount: number;
};

const OCCASION_EMOJI: Record<DashboardCapsule["occasionType"], string> = {
  BIRTHDAY: "🎂",
  ANNIVERSARY: "💍",
  RETIREMENT: "🎉",
  GRADUATION: "🎓",
  WEDDING: "💐",
  OTHER: "✨",
};

function capsuleStatusLabel(status: DashboardCapsule["status"]): string {
  switch (status) {
    case "DRAFT":
      return "Draft";
    case "ACTIVE":
      return "Collecting";
    case "SEALED":
      return "Sealed";
    case "REVEALED":
      return "Revealed";
  }
}

function capsuleStatusClass(status: DashboardCapsule["status"]): string {
  switch (status) {
    case "DRAFT":
      return "text-ink-light bg-[#f1f5f9]";
    case "ACTIVE":
      return "text-amber bg-amber-tint";
    case "SEALED":
      return "text-gold bg-gold-tint";
    case "REVEALED":
      return "text-green-700 bg-green-50";
  }
}

/**
 * Two-column dashboard spine: child Vaults on the left, Memory
 * Capsules on the right. Both columns always render — including
 * when empty — so the parallel product structure stays obvious.
 */
export function DashboardGrid({
  vaults,
  capsules,
  activeVaultChildId,
}: {
  vaults: DashboardVault[];
  capsules: DashboardCapsule[];
  /** Which vault card is currently "selected" in the rail below. */
  activeVaultChildId: string | null;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
      <div className="flex flex-col gap-3">
        <h2 className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber">
          Time Capsules · {vaults.length}
        </h2>

        {vaults.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-navy/10 bg-warm-surface/60 px-5 py-6 text-center">
            <p className="text-sm text-ink-mid leading-[1.5]">
              Start writing to someone you love.
            </p>
            <NewVaultButton variant="primary" label="Start a Time Capsule →" />
          </div>
        ) : (
          vaults.map((v) => (
            <Link
              key={v.childId}
              href={`/dashboard?vault=${v.childId}`}
              className={`rounded-2xl border bg-white px-5 py-4 block transition-all ${
                activeVaultChildId === v.childId
                  ? "border-amber/40 shadow-[0_8px_24px_rgba(196,122,58,0.12)]"
                  : "border-navy/[0.07] hover:border-amber/30 hover:shadow-[0_6px_18px_rgba(15,31,61,0.05)]"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  aria-hidden="true"
                  className="shrink-0 w-10 h-10 rounded-xl bg-amber-tint text-amber flex items-center justify-center"
                >
                  <Lock size={18} strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] font-bold text-navy tracking-[-0.2px] truncate">
                    {v.firstName}&rsquo;s Vault
                  </div>
                  {v.revealDate && (
                    <div className="text-xs text-ink-mid mt-0.5">
                      Opens {formatLong(v.revealDate)}
                    </div>
                  )}
                  <div className="text-[11px] text-ink-light mt-0.5">
                    {v.momentsSealed.toLocaleString()}{" "}
                    {v.momentsSealed === 1 ? "moment sealed" : "moments sealed"}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}

        <NewVaultButton />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-[11px] uppercase tracking-[0.14em] font-bold text-amber">
          Gift Capsules · {capsules.length}
        </h2>

        {capsules.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-navy/10 bg-warm-surface/60 px-5 py-6 text-center">
            <p className="text-sm text-ink-mid leading-[1.5]">
              Create a moment someone will never forget.
            </p>
            <Link
              href="/capsules/new"
              className="mt-4 inline-flex items-center gap-2 bg-amber text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-amber-dark transition-colors"
            >
              <Sparkles size={14} strokeWidth={1.75} aria-hidden="true" />
              New Gift Capsule
            </Link>
          </div>
        ) : (
          capsules.map((c) => (
            <Link
              key={c.id}
              href={`/capsules/${c.id}`}
              className="rounded-2xl border border-navy/[0.07] bg-white px-5 py-4 block hover:border-amber/30 hover:shadow-[0_6px_18px_rgba(15,31,61,0.05)] transition-all"
            >
              <div className="flex items-start gap-3">
                <div
                  aria-hidden="true"
                  className="shrink-0 w-10 h-10 rounded-xl bg-amber-tint flex items-center justify-center text-xl"
                >
                  {OCCASION_EMOJI[c.occasionType]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-[15px] font-bold text-navy tracking-[-0.2px] truncate flex-1 min-w-0">
                      {c.title}
                    </div>
                    <span
                      className={`text-[10px] uppercase tracking-[0.12em] font-bold px-2 py-0.5 rounded ${capsuleStatusClass(
                        c.status,
                      )}`}
                    >
                      {capsuleStatusLabel(c.status)}
                    </span>
                  </div>
                  <div className="text-xs text-ink-mid mt-0.5">
                    Opens {formatLong(c.revealDate)}
                  </div>
                  <div className="text-[11px] text-ink-light mt-0.5">
                    {c.contributorCount.toLocaleString()}{" "}
                    {c.contributorCount === 1
                      ? "contributor"
                      : "contributors"}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}

        <Link
          href="/capsules/new"
          className="mt-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg border border-amber/40 text-amber text-sm font-bold hover:bg-amber-tint transition-colors"
        >
          <PlusCircle size={14} strokeWidth={1.75} aria-hidden="true" />
          New Gift Capsule
        </Link>
      </div>
    </div>
  );
}
