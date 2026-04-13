import { Camera, FileText, Mic, Video, type LucideIcon } from "lucide-react";

type EntryType = "TEXT" | "VOICE" | "PHOTO" | "VIDEO";

const typeConfig: Record<
  EntryType,
  {
    icon: LucideIcon;
    label: string;
    color: string;
  }
> = {
  TEXT: { icon: FileText, label: "Letter", color: "#c47a3a" }, // amber
  VOICE: { icon: Mic, label: "Voice note", color: "#7a9e8a" }, // sage
  PHOTO: { icon: Camera, label: "Photo", color: "#c9a84c" }, // gold
  VIDEO: { icon: Video, label: "Video", color: "#4a5568" }, // ink-mid
};

/**
 * Consistent type-indicator badge used anywhere an entry type is
 * shown — dashboard cards, the child vault view, contributor
 * dashboard, proof-read preview. Colour is driven from a single
 * config so the visual language stays in lockstep across the app.
 */
export function EntryTypeBadge({ type }: { type: EntryType }) {
  const { icon: Icon, label, color } = typeConfig[type];
  return (
    <span
      style={{
        color,
        backgroundColor: `${color}1f`,
      }}
      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-[3px] rounded"
    >
      <Icon size={11} strokeWidth={2} aria-hidden="true" />
      {label}
    </span>
  );
}
