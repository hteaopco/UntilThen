export type CapsuleTone = "CELEBRATION" | "GRATITUDE" | "REMEMBRANCE" | "ENCOURAGEMENT" | "LOVE" | "OTHER";

export const TONE_LABELS: Record<CapsuleTone, string> = {
  CELEBRATION: "Celebration",
  GRATITUDE: "Gratitude",
  REMEMBRANCE: "Remembrance",
  ENCOURAGEMENT: "Encouragement",
  LOVE: "Love",
  OTHER: "Other",
};

export const TONE_DESCRIPTIONS: Record<CapsuleTone, string> = {
  CELEBRATION: "Joy, milestones, and big moments",
  GRATITUDE: "Appreciation and thank you",
  REMEMBRANCE: "Honoring and remembering",
  ENCOURAGEMENT: "Support and strength",
  LOVE: "Intimate and heartfelt",
  OTHER: "Something else entirely",
};

export const TONE_EMOJI: Record<CapsuleTone, string> = {
  CELEBRATION: "🎉",
  GRATITUDE: "🙏",
  REMEMBRANCE: "🕊️",
  ENCOURAGEMENT: "💪",
  LOVE: "❤️",
  OTHER: "✨",
};

export const TONE_REVEAL_BG: Record<CapsuleTone, string> = {
  CELEBRATION: "bg-warm-surface",
  GRATITUDE: "bg-warm-surface",
  REMEMBRANCE: "bg-[#f0f5f2]",
  ENCOURAGEMENT: "bg-[#fdf6e3]",
  LOVE: "bg-[#fdf2f0]",
  OTHER: "bg-cream",
};

export const TONE_HERO: Record<CapsuleTone, string> = {
  CELEBRATION: "Something\u2019s waiting for you.",
  GRATITUDE: "Someone wanted to thank you.",
  REMEMBRANCE: "People are thinking of you.",
  ENCOURAGEMENT: "You\u2019re not alone in this.",
  LOVE: "Someone has something to tell you.",
  OTHER: "Something\u2019s waiting for you.",
};

export const TONE_UNLOCK_LINE: Record<CapsuleTone, string> = {
  CELEBRATION: "Here\u2019s what they wrote for you.",
  GRATITUDE: "Here\u2019s what they wanted to say.",
  REMEMBRANCE: "Here\u2019s what they wanted you to know.",
  ENCOURAGEMENT: "Here\u2019s what they want you to hear.",
  LOVE: "Here\u2019s what they wrote for you.",
  OTHER: "Here\u2019s what they wrote for you.",
};

export function toneClosingLine(tone: CapsuleTone, count: number): string {
  const n = count === 1 ? "1 person" : `${count} people`;
  switch (tone) {
    case "CELEBRATION": return `That was ${n} who wrote to you.`;
    case "GRATITUDE": return `${n} wanted to thank you.`;
    case "REMEMBRANCE": return `${n} are holding you close.`;
    case "ENCOURAGEMENT": return `${n} believe in you.`;
    case "LOVE": return `${n} love you.`;
    default: return `That was ${n} who wrote to you.`;
  }
}

export const TONE_INVITE_LINE1: Record<CapsuleTone, string> = {
  CELEBRATION: "You\u2019ve been invited to create something for",
  GRATITUDE: "You\u2019ve been invited to say thank you to",
  REMEMBRANCE: "You\u2019ve been invited to share a memory of",
  ENCOURAGEMENT: "You\u2019ve been invited to send encouragement to",
  LOVE: "You\u2019ve been invited to write something for",
  OTHER: "You\u2019ve been invited to create something for",
};

export const TONE_INVITE_LINE2: Record<CapsuleTone, (contraction: string) => string> = {
  CELEBRATION: (c) => `A message. A memory. Something ${c} open and experience forever.`,
  GRATITUDE: (c) => `A message of thanks. Something ${c} keep forever.`,
  REMEMBRANCE: (_c) => `A memory. A kind word. Something to let them know they\u2019re not alone.`,
  ENCOURAGEMENT: (_c) => `A few words of support. Something to lift them up.`,
  LOVE: (_c) => `A letter. A memory. Something from the heart.`,
  OTHER: (c) => `A message. A memory. Something ${c} open and experience forever.`,
};

export const TONE_EDITOR_HINT: Record<CapsuleTone, string> = {
  CELEBRATION: "Write what comes to mind \u2014 a favorite memory, something you admire, or just what you want them to know.",
  GRATITUDE: "What do you want to thank them for? A moment, a quality, something they did\u2026",
  REMEMBRANCE: "Share a memory, a story, or something they meant to you\u2026",
  ENCOURAGEMENT: "What do you want them to know? You\u2019re stronger than you think\u2026",
  LOVE: "What do you want to tell them? Something you\u2019ve never said, or just how you feel\u2026",
  OTHER: "Write what comes to mind \u2014 a favorite memory, something you admire, or just what you want them to know.",
};

export const TONE_THANKYOU: Record<CapsuleTone, (pronoun: string) => string> = {
  CELEBRATION: (p) => `That\u2019s going to mean everything to ${p}.`,
  GRATITUDE: (_p) => `They\u2019re going to feel so appreciated.`,
  REMEMBRANCE: (_p) => `That meant more than you know.`,
  ENCOURAGEMENT: (_p) => `That\u2019s going to give them strength.`,
  LOVE: (_p) => `That\u2019s going to mean everything.`,
  OTHER: (p) => `That\u2019s going to mean everything to ${p}.`,
};

export function toneHasConfetti(tone: CapsuleTone): boolean {
  return tone === "CELEBRATION" || tone === "LOVE";
}

export function toneHasFireworks(tone: CapsuleTone): boolean {
  return tone === "CELEBRATION";
}

export const TONE_UPSELL: Record<CapsuleTone, { headline: string; sub: string }> = {
  CELEBRATION: { headline: "Love this idea?", sub: "Write to someone you love \u2014 for years, not just once." },
  GRATITUDE: { headline: "Love this idea?", sub: "Start a capsule for someone who matters." },
  REMEMBRANCE: { headline: "Create something meaningful.", sub: "A lasting tribute for someone you love." },
  ENCOURAGEMENT: { headline: "Love this idea?", sub: "Write to someone you love \u2014 for years, not just once." },
  LOVE: { headline: "Love this idea?", sub: "Write to someone you love \u2014 for years, not just once." },
  OTHER: { headline: "Love this idea?", sub: "Write to someone you love \u2014 for years, not just once." },
};
