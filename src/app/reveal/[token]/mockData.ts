import type { RevealCapsule, RevealContribution } from "./RevealExperience";

/**
 * Shared seed data for reveal previews. Used by:
 *   - /admin/previews → "Recipient Reveal — Mock Capsule"
 *   - /capsules/[id]/preview → "Randomized full experience" toggle
 *
 * Nine contributions (5 stories + 4 gallery-only) chosen to
 * exercise every card type, the letter expand state, and the
 * transition screen.
 *
 * Photos hot-link from Unsplash CDN, voice samples from the W3C
 * public MP3 — both stable and free.
 */

// Stable, hot-linkable Unsplash photos. ?w=800&q=80 keeps the
// payload small while staying sharp on retina story cards.
// Birthday cake with candles — replaces the earlier balloon
// shot, which was too flat on cream backgrounds.
const PHOTO_BIRTHDAY =
  "https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800&q=80";
const PHOTO_BABY =
  "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800&q=80";
const PHOTO_FAMILY =
  "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&q=80";

// Fallback used when the admin hasn't yet generated the ElevenLabs
// stock voices via /admin/settings → "Generate stock voices". Keeps
// the mock preview functional (however silly) on a fresh install.
const VOICE_FALLBACK = "https://www.w3schools.com/html/horse.mp3";

/**
 * Build a seeded capsule. Callers can override recipientName +
 * revealDate so the demo feels personal when running on top of a
 * real capsule (organiser preview). Defaults to the "Olivia"
 * flavour used in the generic admin mock.
 */
export function mockRevealCapsule(overrides: Partial<RevealCapsule> = {}): RevealCapsule {
  return {
    id: "mock-capsule",
    title: "Olivia's First Birthday",
    recipientName: "Olivia",
    occasionType: "BIRTHDAY",
    tone: "CELEBRATION",
    revealDate: new Date("2032-06-24T09:00:00Z").toISOString(),
    isFirstOpen: true,
    hasCompleted: false,
    ...overrides,
  };
}

export type StockVoiceUrls = {
  grandmaRose?: string | null;
  grandpaBill?: string | null;
};

/**
 * Build the mock contribution list with signed stock-voice URLs
 * injected (if available). Falls back to the placeholder horse
 * sample when the admin hasn't generated ElevenLabs audio yet.
 */
export function buildMockContributions(
  urls: StockVoiceUrls = {},
): RevealContribution[] {
  const grandma = urls.grandmaRose ?? VOICE_FALLBACK;
  const grandpa = urls.grandpaBill ?? VOICE_FALLBACK;
  return MOCK_CONTRIBUTIONS_TEMPLATE.map((c) => {
    if (c.id === "m3") {
      return { ...c, media: [{ kind: "voice", url: grandma }] };
    }
    if (c.id === "m8") {
      return { ...c, media: [{ kind: "voice", url: grandpa }] };
    }
    return c;
  });
}

const MOCK_CONTRIBUTIONS_TEMPLATE: RevealContribution[] = [
  {
    id: "m1",
    authorName: "Mom",
    authorAvatarUrl: null,
    type: "PHOTO",
    title: "Your first birthday.",
    body: "<p>Look at that smile. You wouldn't stop laughing all afternoon.</p>",
    media: [{ kind: "photo", url: PHOTO_BIRTHDAY }],
    createdAt: "2031-06-24T15:30:00Z",
  },
  {
    id: "m2",
    authorName: "Dad",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>Dear Olivia,</p>" +
      "<p>I can't believe how fast the years have gone. Watching you grow has been the greatest joy of my life.</p>" +
      "<p>You are kind, curious, and braver than you know. Never forget that you are so loved, always.</p>" +
      "<p>I'll always be here, cheering you on in everything you do.</p>",
    media: [],
    createdAt: "2031-06-24T16:00:00Z",
  },
  {
    id: "m3",
    authorName: "Grandma Rose",
    authorAvatarUrl: null,
    type: "VOICE",
    title: null,
    body: null,
    media: [{ kind: "voice", url: VOICE_FALLBACK }],
    createdAt: "2031-06-24T17:00:00Z",
  },
  {
    id: "m4",
    authorName: "Aunt Jess",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>Dear Olivia,</p>" +
      "<p>The day you were born, the whole family changed. Your mom called me at 4am crying-happy, your dad couldn't string two words together, and your grandma drove three hours through traffic just to be there when she could finally hold you.</p>" +
      "<p>I want you to know — every person who showed up that week, and every person who's still here now, is rooting for you. Quietly, loudly, always. You will never be alone in this.</p>" +
      "<p>The world you're growing up in is going to push you. You're going to have hard days where nothing makes sense. On those days I want you to know two things: it's okay to fall apart, and the people who love you will help you put it back together.</p>" +
      "<p>I hope you grow up brave. I hope you grow up curious. I hope you grow up exactly as you are.</p>" +
      "<p>All my love,</p>",
    media: [],
    createdAt: "2031-06-24T18:00:00Z",
  },
  {
    id: "m5",
    authorName: "Mom",
    authorAvatarUrl: null,
    type: "PHOTO",
    title: "You and Dad on the porch.",
    body: null,
    media: [{ kind: "photo", url: PHOTO_FAMILY }],
    createdAt: "2031-06-25T09:00:00Z",
  },
  {
    id: "m6",
    authorName: "Best Friend Alex",
    authorAvatarUrl: null,
    type: "TEXT",
    title: "To my person",
    body:
      "<p>Twenty years of friendship and you still make me laugh harder than anyone.</p>" +
      "<p>Here's to twenty more.</p>",
    media: [],
    createdAt: "2031-06-25T11:00:00Z",
  },
  {
    id: "m7",
    authorName: "Brother Jake",
    authorAvatarUrl: null,
    type: "PHOTO",
    title: "When you fell asleep on me",
    body: null,
    media: [{ kind: "photo", url: PHOTO_BABY }],
    createdAt: "2031-06-25T12:30:00Z",
  },
  {
    id: "m8",
    authorName: "Grandpa Bill",
    authorAvatarUrl: null,
    type: "VOICE",
    title: null,
    body: null,
    media: [{ kind: "voice", url: VOICE_FALLBACK }],
    createdAt: "2031-06-25T14:00:00Z",
  },
  {
    id: "m9",
    authorName: "Mom",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>Dear Olivia,</p>" +
      "<p>One more for you. I love being your mom. Today and every day.</p>",
    media: [],
    createdAt: "2031-06-26T08:00:00Z",
  },
];

/**
 * Back-compat export for callers without access to signed R2 URLs
 * (client-only surfaces). Shows the VOICE_FALLBACK placeholder for
 * the two VOICE contributions; surfaces that want the real stock
 * voices should call buildMockContributions(urls) from a server
 * component that has signed the R2 keys.
 */
export const MOCK_CONTRIBUTIONS: RevealContribution[] = buildMockContributions();
