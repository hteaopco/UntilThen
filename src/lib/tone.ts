export type CapsuleTone = "CELEBRATION" | "GRATITUDE" | "THINKING_OF_YOU" | "ENCOURAGEMENT" | "LOVE" | "OTHER";

export const TONE_LABELS: Record<CapsuleTone, string> = {
  CELEBRATION: "Joyful",
  GRATITUDE: "Grateful",
  THINKING_OF_YOU: "Thinking of you",
  ENCOURAGEMENT: "Encouraging",
  LOVE: "Loving",
  OTHER: "Other",
};

export const TONE_DESCRIPTIONS: Record<CapsuleTone, string> = {
  CELEBRATION: "Joy, milestones, and big moments",
  GRATITUDE: "Appreciation and thank you",
  THINKING_OF_YOU: "Care, presence, and being there",
  ENCOURAGEMENT: "Support and strength",
  LOVE: "Intimate and heartfelt",
  OTHER: "Something else entirely",
};

export const TONE_EMOJI: Record<CapsuleTone, string> = {
  CELEBRATION: "\u{1F389}",
  GRATITUDE: "\u{1F64F}",
  THINKING_OF_YOU: "\u{1F54A}\uFE0F",
  ENCOURAGEMENT: "\u{1F4AA}",
  LOVE: "\u2764\uFE0F",
  OTHER: "\u2728",
};

export const TONE_REVEAL_BG: Record<CapsuleTone, string> = {
  CELEBRATION: "bg-warm-surface",
  GRATITUDE: "bg-warm-surface",
  THINKING_OF_YOU: "bg-[#f0f5f2]",
  ENCOURAGEMENT: "bg-[#fdf6e3]",
  LOVE: "bg-[#fdf2f0]",
  OTHER: "bg-cream",
};

export const TONE_HERO: Record<CapsuleTone, string> = {
  CELEBRATION: "Something\u2019s waiting for you.",
  GRATITUDE: "This was written with you in mind.",
  THINKING_OF_YOU: "You\u2019ve been on their minds.",
  ENCOURAGEMENT: "You\u2019re not alone in this.",
  LOVE: "This was written for you.",
  OTHER: "Something\u2019s waiting for you.",
};

export const TONE_UNLOCK_LINE: Record<CapsuleTone, string> = {
  CELEBRATION: "This was made to celebrate you.",
  GRATITUDE: "Here\u2019s what they wanted to say.",
  THINKING_OF_YOU: "Here\u2019s what they wanted you to know.",
  ENCOURAGEMENT: "This is what they want you to hear.",
  LOVE: "This is how they feel about you.",
  OTHER: "Here\u2019s what they wrote for you.",
};

export function toneClosingLine(tone: CapsuleTone): string {
  switch (tone) {
    case "CELEBRATION": return "They showed up for you.";
    case "GRATITUDE": return "They took time to thank you.";
    case "THINKING_OF_YOU": return "You\u2019re not alone.";
    case "ENCOURAGEMENT": return "People believe in you.";
    case "LOVE": return "You\u2019re deeply loved.";
    default: return "This was all for you.";
  }
}

export const TONE_INVITE_LINE1: Record<CapsuleTone, string> = {
  CELEBRATION: "You\u2019ve been invited to create something for",
  GRATITUDE: "You\u2019ve been invited to thank",
  THINKING_OF_YOU: "You\u2019ve been invited to share something for",
  ENCOURAGEMENT: "You\u2019ve been invited to send encouragement to",
  LOVE: "You\u2019ve been invited to write something for",
  OTHER: "You\u2019ve been invited to create something for",
};

export const TONE_INVITE_LINE2: Record<CapsuleTone, (contraction: string) => string> = {
  CELEBRATION: (_c) => "A message. A memory. Something they\u2019ll open and feel for years.",
  GRATITUDE: (_c) => "A message of thanks. Something they\u2019ll keep with them.",
  THINKING_OF_YOU: (_c) => "A message to let them know you\u2019re there. Something they can come back to.",
  ENCOURAGEMENT: (_c) => "A few words of support. Something to lift them up.",
  LOVE: (_c) => "A letter. A memory. Something from the heart.",
  OTHER: (_c) => "A message. A memory. Something they\u2019ll open when it matters.",
};

export const TONE_EDITOR_HINT: Record<CapsuleTone, string> = {
  CELEBRATION: "Write what comes to mind \u2014 a favorite memory, something you admire, or just what you want them to know.",
  GRATITUDE: "What do you want to thank them for? A moment, a quality, something they did\u2026",
  THINKING_OF_YOU: "What do you want them to feel? A reminder they\u2019re not alone, or that you\u2019re thinking of them.",
  ENCOURAGEMENT: "What do you want them to hear? Something steady, something they can come back to\u2026",
  LOVE: "What do you want to tell them? Something you\u2019ve never said, or something they should always remember\u2026",
  OTHER: "Write what comes to mind \u2014 a favorite memory, something you admire, or just what you want them to know.",
};

export const TONE_THANKYOU: Record<CapsuleTone, (pronoun: string) => string> = {
  CELEBRATION: (_p) => "That\u2019s going to mean a lot to them.",
  GRATITUDE: (_p) => "They\u2019re going to feel this.",
  THINKING_OF_YOU: (_p) => "That\u2019s going to mean more than you know.",
  ENCOURAGEMENT: (_p) => "This is going to give them strength.",
  LOVE: (_p) => "That\u2019s going to stay with them.",
  OTHER: (_p) => "That\u2019s going to mean a lot to them.",
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
  THINKING_OF_YOU: { headline: "Create something meaningful.", sub: "Be there for someone \u2014 even when you\u2019re not with them." },
  ENCOURAGEMENT: { headline: "Love this idea?", sub: "Write something they can come back to." },
  LOVE: { headline: "Love this idea?", sub: "Write something they\u2019ll carry with them." },
  OTHER: { headline: "Love this idea?", sub: "Write to someone you love \u2014 for years, not just once." },
};
