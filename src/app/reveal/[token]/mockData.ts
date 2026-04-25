import type { RevealCapsule, RevealContribution } from "./RevealExperience";

/**
 * Seed data for reveal previews. Two flavours:
 *
 *   VAULT (MOCK_CONTRIBUTIONS_TEMPLATE / buildMockContributions /
 *   MOCK_CONTRIBUTIONS) — parents writing into a child's vault.
 *   Nine contributions exercising every card type. Used by
 *   /vault/[childId]/preview's "Full demo" toggle and the admin
 *   mock at /admin/previews.
 *
 *   CAPSULE (MOCK_CAPSULE_CONTRIBUTIONS_TEMPLATE /
 *   buildMockCapsuleContributions / MOCK_CAPSULE_CONTRIBUTIONS)
 *   — friends + family writing into a gift capsule for an adult
 *   birthday. Fifteen contributions: 5 highlights for the Stories
 *   phase + 10 gallery-only letters. Used by
 *   /capsules/[id]/preview's "Full demo" toggle. mockRevealCapsuleBirthday
 *   pairs with this template to give the demo capsule a matching
 *   title.
 *
 * Photos hot-link from Unsplash CDN, voice samples from the W3C
 * public MP3 — both stable and free. Voice cards rebind their
 * src to the admin-uploaded ElevenLabs stock voice when present
 * (vault-mom for the vault flavour, capsule-birthday for the
 * capsule flavour).
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
// Group of friends — used as the "group photo" placeholder in the
// gift-capsule mock. Stable Unsplash CDN.
const PHOTO_FRIEND_GROUP =
  "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800&q=80";

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
  vaultMom?: string | null;
  capsuleBirthday?: string | null;
};

/**
 * Build the vault-flavoured mock contribution list (parents writing
 * to their child) with the signed stock-voice URL injected.
 * Falls back to the placeholder horse sample when the admin hasn't
 * uploaded a stock voice yet.
 *
 * Used by the vault preview and the admin mock. The gift-capsule
 * preview uses buildMockCapsuleContributions instead (different
 * authors, different occasion, different reveal-day energy).
 */
export function buildMockContributions(
  urls: StockVoiceUrls = {},
): RevealContribution[] {
  const mom = urls.vaultMom ?? VOICE_FALLBACK;
  return MOCK_CONTRIBUTIONS_TEMPLATE.map((c) => {
    if (c.id === "m3") {
      return { ...c, media: [{ kind: "voice", url: mom }] };
    }
    return c;
  });
}

/**
 * Build the gift-capsule-flavoured mock — adult-Olivia birthday
 * capsule with friends + family writing in. Five Story highlights
 * (best-friend letter, cake photo, mom letter, friend voice note,
 * group photo) followed by ten gallery-only letters from people in
 * different parts of her life.
 *
 * Used by /capsules/[id]/preview's "Full demo" mode. Voice URL
 * routes through the capsule-birthday stock voice (or the W3C
 * fallback if the admin hasn't generated it yet).
 */
export function buildMockCapsuleContributions(
  urls: StockVoiceUrls = {},
): RevealContribution[] {
  const friend = urls.capsuleBirthday ?? VOICE_FALLBACK;
  return MOCK_CAPSULE_CONTRIBUTIONS_TEMPLATE.map((c) => {
    if (c.id === "c4") {
      return { ...c, media: [{ kind: "voice", url: friend }] };
    }
    return c;
  });
}

/**
 * Capsule-flavoured RevealCapsule for the gift-capsule preview's
 * "Full demo" mode. Same Olivia recipient as the vault mock so the
 * names line up across surfaces, but the title + occasion fit an
 * adult birthday. Callers can override id / recipientName /
 * revealDate / title to make the demo sit on top of a real capsule.
 */
export function mockRevealCapsuleBirthday(
  overrides: Partial<RevealCapsule> = {},
): RevealCapsule {
  return {
    ...mockRevealCapsule(),
    title: "Olivia's Birthday",
    ...overrides,
  };
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
    authorName: "Mom",
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
    type: "TEXT",
    title: null,
    body:
      "<p>Happy birthday, Olivia.</p>" +
      "<p>I held you the day you came home from the hospital — you fell asleep right on my chest. " +
      "I don't think you stirred for three hours. Your mama kept checking to make sure I was still breathing too.</p>" +
      "<p>Do wonderful things, kiddo. Grandpa's proud of you. Always.</p>",
    media: [],
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
 * Gift-capsule template — Olivia's adult birthday. Fifteen
 * contributions: five highlights (in array order — Stories phase
 * picks the first 5) followed by ten gallery-only letters from
 * different people in her life. With contributions > STORY_LIMIT
 * the Transition screen kicks in between Stories and Gallery.
 *
 * Highlights (Stories slides):
 *   c1 — Best friend Sarah, letter
 *   c2 — Mom, birthday cake photo
 *   c3 — Mom, letter (watching Olivia grow up)
 *   c4 — Friend Megan, voice note (admin-uploaded; fallback before)
 *   c5 — Best friend Sarah, group photo
 *
 * Gallery-only letters (c6-c15) — kept short (5-7 sentences) so
 * the gallery feels populated without making any single tile a
 * wall of text.
 *
 * Photo highlights (c2 + c5) intentionally have title=null and
 * body=null so each maps to exactly one Stories slide. Adding a
 * caption would split it into a letter slide + photo slide and
 * push c5 out of the highlights window.
 */
const MOCK_CAPSULE_CONTRIBUTIONS_TEMPLATE: RevealContribution[] = [
  // ── Highlight #1 — Best friend letter ─────────────────────────
  {
    id: "c1",
    authorName: "Sarah",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>Olivia, you have been my person since we were sixteen.</p>" +
      "<p>Through every move, every heartbreak, every weird phase — you've been right there, picking up the phone at midnight without asking what's wrong. I've watched you become this incredible woman who makes everyone around her better, and I'm so lucky you let me come along for it.</p>" +
      "<p>There's no one I'd rather laugh-cry with at a wedding or sit next to in silence at the worst moments.</p>" +
      "<p>Happy birthday to my favorite person on this planet. I love you more than coffee, and that's saying something.</p>",
    media: [],
    createdAt: "2031-06-24T09:00:00Z",
  },

  // ── Highlight #2 — Birthday cake photo ────────────────────────
  {
    id: "c2",
    authorName: "Mom",
    authorAvatarUrl: null,
    type: "PHOTO",
    title: null,
    body: null,
    media: [{ kind: "photo", url: PHOTO_BIRTHDAY }],
    createdAt: "2031-06-24T10:00:00Z",
  },

  // ── Highlight #3 — Mom letter ─────────────────────────────────
  {
    id: "c3",
    authorName: "Mom",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>My Olivia, watching you grow up has been the great adventure of my life.</p>" +
      "<p>I remember the day we brought you home — you were so tiny, so determined, already kicking off the blanket like you had places to be. You've been like that ever since.</p>" +
      "<p>You taught yourself to read at four because you were tired of waiting for me to finish dinner. You brought home every stray cat in the neighborhood and named them all. You cried when your soccer team lost and then you cried harder when they won.</p>" +
      "<p>Now I watch you be brilliant and brave and so much yourself, and I think — every hard day was worth it for this one. Being your mom is the best thing I've ever done.</p>" +
      "<p>Happy birthday, sweet girl. I love you to the moon and back, always.</p>",
    media: [],
    createdAt: "2031-06-24T11:00:00Z",
  },

  // ── Highlight #4 — Friend voice note ──────────────────────────
  // URL is rebound to capsuleBirthday in buildMockCapsuleContributions.
  {
    id: "c4",
    authorName: "Megan",
    authorAvatarUrl: null,
    type: "VOICE",
    title: null,
    body: null,
    media: [{ kind: "voice", url: VOICE_FALLBACK }],
    createdAt: "2031-06-24T12:00:00Z",
  },

  // ── Highlight #5 — Group photo ────────────────────────────────
  {
    id: "c5",
    authorName: "Sarah",
    authorAvatarUrl: null,
    type: "PHOTO",
    title: null,
    body: null,
    media: [{ kind: "photo", url: PHOTO_FRIEND_GROUP }],
    createdAt: "2031-06-24T13:00:00Z",
  },

  // ── Gallery-only letters (c6-c15, 5-7 sentences each) ─────────
  {
    id: "c6",
    authorName: "Aunt Becca",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>Olivia. My favorite human (don't tell your sister).</p>" +
      "<p>I've watched you grow into someone who is both wickedly funny and deeply kind, and I don't know how you pulled that off. Thank you for letting me be the cool aunt who buys you wine instead of life advice.</p>" +
      "<p>Happy birthday, my girl. Save me a slice of cake.</p>",
    media: [],
    createdAt: "2031-06-14T18:00:00Z",
  },
  {
    id: "c7",
    authorName: "Jules",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>Liv. We've fought over makeup, clothes, the front seat, and at least one boyfriend over the years. None of that mattered then and none of it matters now.</p>" +
      "<p>You're the first person I call when something good happens, and the first one I call when something falls apart. Thank you for being the kind of sister you don't get a second of.</p>" +
      "<p>Love you forever, even when you're being annoying. Happy birthday.</p>",
    media: [],
    createdAt: "2031-06-15T09:30:00Z",
  },
  {
    id: "c8",
    authorName: "Priya",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>To the only person who could survive a year of my 7am alarms — happy birthday.</p>" +
      "<p>I think about our junior-year apartment more than I should, especially the night we ate ice cream straight from the carton at 2am because nothing else made sense. You held me together that year. Then you went and held a hundred other people together too, because that's just what you do.</p>" +
      "<p>The world is luckier because you're in it. Eat the cake, take the trip, kiss the boy, pick the wine that's too expensive.</p>",
    media: [],
    createdAt: "2031-06-16T20:15:00Z",
  },
  {
    id: "c9",
    authorName: "Marcus",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>Olivia, you've been one of my favorite people since 9th grade Spanish, where we both barely passed and laughed about it for the rest of the semester.</p>" +
      "<p>I know we don't talk every day anymore, but every time we do it feels like no time has passed. That's a rare friendship and I don't take it for granted.</p>" +
      "<p>Hope this year brings you everything you're chasing. Happy birthday, friend.</p>",
    media: [],
    createdAt: "2031-06-17T11:00:00Z",
  },
  {
    id: "c10",
    authorName: "Uncle Tom",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>Kid. I've known you since you were three feet tall and convinced you could fly off the back porch.</p>" +
      "<p>Some things haven't changed — you still aim higher than the rest of us think is reasonable, and you still mostly stick the landing. Your dad and I are proud as hell of you, even if we don't say it enough.</p>" +
      "<p>Cheers to another trip around the sun. Buy yourself something stupid for me.</p>",
    media: [],
    createdAt: "2031-06-18T16:45:00Z",
  },
  {
    id: "c11",
    authorName: "Maya",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>Olivia, I know we're technically supposed to be coworkers, but I think we both know we crossed into real-friend territory about six months in.</p>" +
      "<p>You make work bearable on the worst days and genuinely fun on the good ones. Whoever ends up with you on their team is lucky and they should know it.</p>" +
      "<p>I'm rooting for everything you do this year — keep going. Happy birthday.</p>",
    media: [],
    createdAt: "2031-06-19T12:30:00Z",
  },
  {
    id: "c12",
    authorName: "Cousin Tyler",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>Liv. Birthday letters aren't really my thing, but here we are.</p>" +
      "<p>You've been more like a sister to me than a cousin since we were kids — I still remember the summer we tried to start that lemonade stand and lost money on it. Thirty bucks in the hole and we still thought we were entrepreneurs.</p>" +
      "<p>Anyway. You're one of the best people I know. Happy birthday.</p>",
    media: [],
    createdAt: "2031-06-20T08:00:00Z",
  },
  {
    id: "c13",
    authorName: "Dr. Reyes",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>Olivia, when you walked into my office for the first time as my mentee, I thought, this one is going to be a force.</p>" +
      "<p>Five years later I'm not sure I've ever been more right about a person. You bring rigor and warmth to everything you touch, and that's a rarer combination than you realize.</p>" +
      "<p>Whatever you decide to do with this next chapter, you're going to be remarkable at it. Happy birthday.</p>",
    media: [],
    createdAt: "2031-06-21T14:00:00Z",
  },
  {
    id: "c14",
    authorName: "Emma",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>Liv. We've been best friends since we were six and I climbed the tree in your backyard and got stuck.</p>" +
      "<p>Twenty-something years later you're still the person who shows up when I'm stuck — emotionally now, mostly, instead of literally. You have made every chapter of my life better just by being in it.</p>" +
      "<p>I hope this year is everything you want it to be, and a few things you didn't know you wanted. Happy birthday, my oldest friend.</p>",
    media: [],
    createdAt: "2031-06-22T19:45:00Z",
  },
  {
    id: "c15",
    authorName: "Anna",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>Olivia, when your family moved in three doors down, I told my husband, that's a kid who's going to be trouble in the best way. I was right.</p>" +
      "<p>Watching you grow up next door has been one of the joys of our quiet little street. We're so proud of the woman you've become.</p>" +
      "<p>Come over for tea soon — bring the dog. Happy birthday, sweet girl.</p>",
    media: [],
    createdAt: "2031-06-23T10:00:00Z",
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

/** Same back-compat shape, gift-capsule flavour. Used by
 *  /capsules/[id]/preview's "Full demo" mode. */
export const MOCK_CAPSULE_CONTRIBUTIONS: RevealContribution[] =
  buildMockCapsuleContributions();
