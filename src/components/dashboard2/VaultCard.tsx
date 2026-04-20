import Link from "next/link";
import { FileText, Image as ImageIcon, Pencil, AudioLines } from "lucide-react";

export type VaultCardData = {
  childId: string;
  firstName: string;
  coverUrl: string | null;
  entryCount: number;
  photoCount: number;
  voiceCount: number;
};

/**
 * Vault card for the dashboard2 "Your Time Capsules" carousel. Outer
 * white card with a gradient-placeholder (or real cover) image on
 * top and a white footer carrying the child name + three stat pills.
 *
 * Pencil badge currently just renders — wiring it to an upload +
 * crop modal is a follow-up once the Vault.coverUrl column + R2
 * vault-target support are in place.
 */
export function VaultCard({ vault }: { vault: VaultCardData }) {
  const mock = mockCounts(vault.firstName);
  return (
    <Link
      href={`/account/capsules/${vault.childId}`}
      prefetch={false}
      className="snap-start shrink-0 w-[72vw] max-w-[260px] sm:w-[240px] rounded-2xl bg-white border-2 border-amber/60 shadow-[0_8px_24px_-8px_rgba(196,122,58,0.2)] hover:shadow-[0_12px_32px_-8px_rgba(196,122,58,0.3)] transition-shadow overflow-hidden flex flex-col"
    >
      <div className="relative aspect-[4/3] sm:aspect-square bg-gradient-to-br from-amber/20 via-cream to-gold/20 rounded-t-2xl overflow-hidden">
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
          <Pencil size={15} strokeWidth={2} className="text-amber" />
        </div>
      </div>

      <div className="p-4 flex flex-col gap-2">
        <h3 className="text-[22px] font-bold text-navy tracking-[-0.3px] leading-tight">
          {vault.firstName}
        </h3>
        <div className="flex items-center gap-4 text-ink-light">
          <StatPill icon={<FileText size={16} strokeWidth={1.75} />} count={mock.entries} />
          <StatPill icon={<ImageIcon size={16} strokeWidth={1.75} />} count={mock.photos} />
          <StatPill icon={<AudioLines size={16} strokeWidth={1.75} />} count={mock.voices} />
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
  const gradient = GRADIENTS[hashOf(seed) % GRADIENTS.length];
  return (
    <div
      className={`absolute inset-0 bg-gradient-to-br ${gradient}`}
      aria-hidden="true"
    />
  );
}

function hashOf(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return hash;
}

// Mock counts until real entry/photo/voice counts start landing. Hash-
// driven so each child gets a distinct-feeling set without hand-picking.
function mockCounts(name: string): { entries: number; photos: number; voices: number } {
  const h = hashOf(name);
  return {
    entries: 20 + (h % 30),
    photos: 8 + ((h >>> 5) % 20),
    voices: 2 + ((h >>> 10) % 12),
  };
}
