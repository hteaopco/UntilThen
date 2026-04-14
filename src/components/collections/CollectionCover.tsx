import {
  Book,
  BookOpen,
  Camera,
  Gift,
  GraduationCap,
  Heart,
  Music,
  Palette,
  PartyPopper,
  Plane,
  Sparkles,
  Star,
  Trophy,
  Utensils,
  type LucideIcon,
} from "lucide-react";

/**
 * Map common words in a collection title/description to a Lucide
 * icon so parents don't have to pick one. First match wins; we
 * fall through to BookOpen as a neutral default.
 */
const KEYWORDS: { re: RegExp; icon: LucideIcon }[] = [
  { re: /first\s*day/i, icon: Sparkles },
  { re: /birth.?day|party|celebrat/i, icon: PartyPopper },
  { re: /school|class|grad|learn|study/i, icon: GraduationCap },
  { re: /travel|trip|vacation|holiday|visit/i, icon: Plane },
  { re: /soccer|football|sport|game|ball|team|match/i, icon: Trophy },
  { re: /music|song|sing|concert|band|choir/i, icon: Music },
  { re: /art|paint|draw|craft|colou?r/i, icon: Palette },
  { re: /photo|picture|camera|polaroid|snap/i, icon: Camera },
  { re: /food|cook|recipe|meal|dinner|breakfast|lunch/i, icon: Utensils },
  { re: /star|dream|wish|sky|night/i, icon: Star },
  { re: /love|heart|anniversary|forever/i, icon: Heart },
  { re: /gift|present|surprise/i, icon: Gift },
  { re: /journal|diary|note|letter/i, icon: BookOpen },
  { re: /story|book|chapter|read|tale/i, icon: Book },
];

export function inferCollectionIcon(title: string): LucideIcon {
  for (const { re, icon } of KEYWORDS) {
    if (re.test(title)) return icon;
  }
  return BookOpen;
}

type Size = "sm" | "md" | "lg";

const ICON_PX: Record<Size, number> = { sm: 16, md: 22, lg: 28 };
const EMOJI_CLS: Record<Size, string> = {
  sm: "text-lg leading-none",
  md: "text-2xl leading-none",
  lg: "text-4xl leading-none",
};

/**
 * Cover glyph for a collection. Two modes:
 * 1. Legacy — `coverEmoji` is a user-selected emoji from the old
 *    picker. Render it as-is for backward compatibility.
 * 2. Default — no stored cover; derive a Lucide icon from the
 *    collection's title so the glyph always feels intentional
 *    without the parent picking anything.
 */
export function CollectionCover({
  title,
  coverEmoji,
  size = "md",
  tone = "amber",
}: {
  title: string;
  coverEmoji: string | null;
  size?: Size;
  tone?: "amber" | "gold";
}) {
  if (coverEmoji && coverEmoji.trim()) {
    return (
      <span aria-hidden="true" className={EMOJI_CLS[size]}>
        {coverEmoji}
      </span>
    );
  }
  const Icon = inferCollectionIcon(title);
  return (
    <Icon
      size={ICON_PX[size]}
      strokeWidth={1.5}
      className={tone === "gold" ? "text-gold" : "text-amber"}
      aria-hidden="true"
    />
  );
}
