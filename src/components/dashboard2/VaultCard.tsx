import Link from "next/link";
import { FileText, Image as ImageIcon, Lock, AudioLines } from "lucide-react";

export type VaultCardData = {
  childId: string;
  firstName: string;
  coverUrl: string | null;
  entryCount: number;
  photoCount: number;
  voiceCount: number;
};

/**
 * Vault card for the dashboard2 "Your Time Capsules" carousel. Renders
 * a square cover photo (gradient placeholder in Phase 1, real image in
 * Phase 2), child name, and three stat pills. Links to the capsule's
 * landing page.
 */
export function VaultCard({ vault }: { vault: VaultCardData }) {
  return (
    <Link
      href={`/account/capsules/${vault.childId}`}
      prefetch={false}
      className="snap-start shrink-0 w-[72vw] max-w-[260px] sm:w-[240px] flex flex-col gap-3 group"
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-amber/20 via-cream to-gold/20 border border-amber/10 shadow-[0_8px_24px_-8px_rgba(196,122,58,0.2)] group-hover:shadow-[0_12px_32px_-8px_rgba(196,122,58,0.3)] transition-shadow">
        {vault.coverUrl ? (
          <img
            src={vault.coverUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <PlaceholderPattern seed={vault.firstName} />
        )}
        <div className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-[0_2px_8px_rgba(15,31,61,0.15)]">
          <Lock size={16} strokeWidth={2} className="text-amber" />
        </div>
      </div>

      <div>
        <h3 className="text-[22px] font-bold text-navy tracking-[-0.3px] leading-tight">
          {vault.firstName}
        </h3>
        <div className="mt-2 flex items-center gap-4 text-ink-light">
          <StatPill icon={<FileText size={16} strokeWidth={1.75} />} count={vault.entryCount} />
          <StatPill icon={<ImageIcon size={16} strokeWidth={1.75} />} count={vault.photoCount} />
          <StatPill icon={<AudioLines size={16} strokeWidth={1.75} />} count={vault.voiceCount} />
        </div>
      </div>
    </Link>
  );
}

function StatPill({ icon, count }: { icon: React.ReactNode; count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-medium">
      <span aria-hidden="true">{icon}</span>
      <span>{count}</span>
    </span>
  );
}

const GRADIENTS = [
  "from-amber/30 via-cream to-gold/25",
  "from-gold/30 via-cream to-sage/20",
  "from-rose-200/40 via-cream to-amber/20",
  "from-sage/25 via-cream to-amber/30",
  "from-amber/25 via-orange-100/40 to-cream",
  "from-navy/15 via-cream to-amber/25",
];

function PlaceholderPattern({ seed }: { seed: string }) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const gradient = GRADIENTS[hash % GRADIENTS.length];
  return (
    <div
      className={`absolute inset-0 bg-gradient-to-br ${gradient}`}
      aria-hidden="true"
    />
  );
}
