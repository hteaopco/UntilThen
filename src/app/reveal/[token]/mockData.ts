import type { RevealCapsule, RevealContribution } from "./RevealExperience";

/**
 * Seed data for reveal previews. Two flavours, same shape:
 *
 *   VAULT (MOCK_CONTRIBUTIONS_TEMPLATE / buildMockContributions /
 *   MOCK_CONTRIBUTIONS) — Olivia's time capsule, written by
 *   family across her life from birth (2031) to her wedding
 *   (2056). Fifteen contributions: 5 Story highlights (baby
 *   photo, wedding photo, mom's voice, letter at age 10, letter
 *   at age 25) + 10 gallery letters from family at different
 *   ages. Used by /vault/[childId]/preview's "Full demo" toggle
 *   and the admin Vault mock at /admin/previews.
 *
 *   CAPSULE (MOCK_CAPSULE_CONTRIBUTIONS_TEMPLATE /
 *   buildMockCapsuleContributions / MOCK_CAPSULE_CONTRIBUTIONS)
 *   — friends + family writing into a gift capsule for adult
 *   Olivia's birthday. Fifteen contributions: 5 highlights
 *   (best-friend letter, cake, mom letter, friend voice, group
 *   photo) + 10 gallery letters from people in different parts
 *   of her life. Used by /capsules/[id]/preview's "Full demo"
 *   toggle and the admin Gift Capsule mock at /admin/previews.
 *   mockRevealCapsuleBirthday pairs with this template to give
 *   the demo capsule a matching title.
 *
 * Both flavours hit > STORY_LIMIT so the Transition screen fires
 * between Stories and Gallery in either preview.
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
// Wedding shot — vault mock highlight #2 (Olivia's adult wedding day).
const PHOTO_WEDDING =
  "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80";

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
    title: "Olivia's Time Capsule",
    recipientName: "Olivia",
    occasionType: "BIRTHDAY",
    tone: "CELEBRATION",
    // Reveal date sits in 2056 — the vault mock spans Olivia's
    // whole life from birth (2031) through her wedding (2056),
    // and we want createdAt timestamps to fall within the vault's
    // collection window.
    revealDate: new Date("2056-09-15T09:00:00Z").toISOString(),
    isFirstOpen: true,
    hasCompleted: false,
    // Admin /admin/previews and other surfaces that consume this
    // mock are inspecting the experience as the organiser, not as
    // a real recipient — there's no claim flow to drive, so flag
    // it as saved to bypass the SavePromptScreen between the
    // highlight reel and the gallery.
    isSaved: true,
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
    if (c.id === "v3") {
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

/**
 * Vault template — Olivia's time capsule, written by Mom across
 * her life from birth (2031) to her wedding (2056). Fifteen
 * contributions: five Story highlights (in array order —
 * Stories phase picks the first 5) followed by ten gallery-only
 * letters from different ages of Olivia's life. Triggers the
 * Transition screen between Stories and Gallery.
 *
 * All entries are authored by "Mom" since vault writing is
 * single-author after migration 20260422_remove_vault_contributors
 * — the parent (organiser) is the only person who writes into a
 * child's vault. The mock reflects that.
 *
 * Highlights (Stories slides):
 *   v1 — Baby photo (newborn)
 *   v2 — Wedding photo (her wedding day)
 *   v3 — Voice note (admin-uploaded vault-mom; fallback before)
 *   v4 — Letter at age 10
 *   v5 — Letter at age 25 / her wedding day
 *
 * Photo highlights (v1 + v2) intentionally have title=null and
 * body=null so each maps to exactly one Stories slide. Adding a
 * caption would split it into a letter slide + photo slide and
 * push v5 out of the highlights window.
 *
 * Gallery letters (v6-v15) span Olivia's life in chronological
 * createdAt order so the Gallery's date column reads as a
 * timeline of Mom's letters across the years.
 */
const MOCK_CONTRIBUTIONS_TEMPLATE: RevealContribution[] = [
  // ── Highlight #1 — Baby photo ─────────────────────────────────
  {
    id: "v1",
    authorName: "Mom",
    authorAvatarUrl: null,
    type: "PHOTO",
    title: null,
    body: null,
    media: [{ kind: "photo", url: PHOTO_BABY }],
    createdAt: "2031-06-24T15:30:00Z",
  },

  // ── Highlight #2 — Wedding photo ──────────────────────────────
  {
    id: "v2",
    authorName: "Mom",
    authorAvatarUrl: null,
    type: "PHOTO",
    title: null,
    body: null,
    media: [{ kind: "photo", url: PHOTO_WEDDING }],
    createdAt: "2056-09-15T16:00:00Z",
  },

  // ── Highlight #3 — Mom voice note ─────────────────────────────
  // URL is rebound to vaultMom in buildMockContributions.
  {
    id: "v3",
    authorName: "Mom",
    authorAvatarUrl: null,
    type: "VOICE",
    title: null,
    body: null,
    media: [{ kind: "voice", url: VOICE_FALLBACK }],
    createdAt: "2036-12-15T20:00:00Z",
  },

  // ── Highlight #4 — Mom's letter on her 10th birthday ──────────
  {
    id: "v4",
    authorName: "Mom",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>Olivia, you turned ten today. We had pizza and your dad made the cake from scratch even though I told him to buy one. He's like that.</p>" +
      "<p>I want to tell you that ten was a great age for me too — you start to see the world a little wider, but you haven't decided yet what kind of person you want to be. You're sitting in this house right now reading on the couch, completely absorbed, and I wish you could see what I see.</p>" +
      "<p>You are funny and kind and so much more interesting than I was at ten. Whatever you become, please keep this version of you somewhere inside you — the curious one, the one who believes the most outlandish thing without flinching.</p>" +
      "<p>I love you a thousand times tonight and a thousand times tomorrow. Happy birthday, my big girl.</p>",
    media: [],
    createdAt: "2041-06-24T19:00:00Z",
  },

  // ── Highlight #5 — Mom's letter on Olivia's wedding day ───────
  {
    id: "v5",
    authorName: "Mom",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>My Olivia. Today you got married.</p>" +
      "<p>I watched you walk toward someone who looks at you the way your dad still looks at me, and I have rarely been so grateful. I want you to know that nothing has prepared me for how proud I am of the woman you've become.</p>" +
      "<p>You are kind in a way that's becoming rare. You are brave in a way that doesn't always announce itself. Marriage is not always easy — there will be hard nights — but you already know how to choose someone, again and again, on the days it's not effortless.</p>" +
      "<p>That's the whole secret. Love each other on the boring Tuesdays.</p>" +
      "<p>Today and always, I love you to the moon and back.</p>",
    media: [],
    createdAt: "2056-09-15T22:00:00Z",
  },

  // ── Gallery letters (v6-v15, 5-7 sentences, life timeline) ────
  {
    id: "v6",
    authorName: "Mom",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>Olivia. You arrived at 4:17am, after a long night I'll never forget.</p>" +
      "<p>They put you on my chest and I cried — not the kind of crying you'd expect, but a quiet kind, like everything in my life had just rearranged itself to make room for you. Your dad was a wreck. I think he forgot his own name for about an hour.</p>" +
      "<p>I want you to know that the second I saw your face, I understood why people say their lives changed when they had a baby. Welcome to the world, sweet girl.</p>",
    media: [],
    createdAt: "2031-06-24T05:00:00Z",
  },
  {
    id: "v7",
    authorName: "Mom",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>Sweet Olivia, today you started kindergarten.</p>" +
      "<p>You waved goodbye without crying — and I absolutely fell apart in the car after. I want you to know that being brave like that is something you've always had in you.</p>" +
      "<p>The world is full of new doors. Walk through them. I love you to pieces.</p>",
    media: [],
    createdAt: "2036-09-01T16:30:00Z",
  },
  {
    id: "v8",
    authorName: "Mom",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>Liv, this Christmas you opened your presents — including that ridiculous singing reindeer your dad got you — and laughed so hard you got the hiccups.</p>" +
      "<p>Watching you find joy in something so small reminded me what Christmas is supposed to feel like. I hope you keep that knack for being delighted by little things forever. The world will try to take it from you. Don't let it.</p>" +
      "<p>Love you, baby.</p>",
    media: [],
    createdAt: "2038-12-25T18:00:00Z",
  },
  {
    id: "v9",
    authorName: "Mom",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>Olivia. This afternoon we sat on the couch for two hours and you read me a chapter of your dragon book. You made me close my eyes during the scary parts.</p>" +
      "<p>Halfway through you announced that you wanted to be a writer 'when I grow up, and also a vet, and also maybe a baker.' I'm writing this so you'll see it later — you can absolutely be all three.</p>" +
      "<p>You already understand things some adults never figure out. Don't let anybody talk you out of it.</p>",
    media: [],
    createdAt: "2040-05-12T15:00:00Z",
  },
  {
    id: "v10",
    authorName: "Mom",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>Olivia, this was the first night you've ever slept somewhere I couldn't get to you in five minutes.</p>" +
      "<p>The house feels strange without your noise. I keep walking past your room expecting to see your light on. I hope camp is everything you wanted — bug bites, terrible mac and cheese, friends you'll keep forever.</p>" +
      "<p>Be brave, baby. I'll see you Sunday.</p>",
    media: [],
    createdAt: "2042-07-08T22:00:00Z",
  },
  {
    id: "v11",
    authorName: "Mom",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>Liv. Sixteen, huh.</p>" +
      "<p>I remember sixteen — I felt invincible and also like a complete moron, mostly at the same time. You're already smarter than I was at this age, and you've barely tried.</p>" +
      "<p>Don't let any of these dumb high school boys break your heart — and if they do, the door is always open here. Happy birthday, my big girl.</p>",
    media: [],
    createdAt: "2047-06-24T20:30:00Z",
  },
  {
    id: "v12",
    authorName: "Mom",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>My Olivia. You called me crying tonight and I wanted to drive across town and fix it for you, the way I could when you were small. I can't anymore.</p>" +
      "<p>So instead I want you to know: this hurts now and that hurt is real. It will not last forever. The boy who didn't see how lucky he was will look back at this exact moment and know.</p>" +
      "<p>I love you. Eat something.</p>",
    media: [],
    createdAt: "2048-10-18T23:00:00Z",
  },
  {
    id: "v13",
    authorName: "Mom",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>Olivia, twenty-one. I cannot believe I'm allowed to write that sentence.</p>" +
      "<p>Twenty-one years ago I was holding you in a hospital wondering how I was supposed to keep you alive, and tonight you're out drinking legally with your friends. I am thrilled and slightly terrified.</p>" +
      "<p>Be safe, be a little bit reckless, take a thousand pictures. Happy birthday, my love.</p>",
    media: [],
    createdAt: "2052-06-24T21:00:00Z",
  },
  {
    id: "v14",
    authorName: "Mom",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>Olivia. I watched you cross that stage today and I'm not going to pretend I didn't cry. Your dad warned me. I tried.</p>" +
      "<p>Anyway — you did it, and you did it your way, and I'm so proud I don't have the words.</p>" +
      "<p>The world is yours now. Go take it.</p>",
    media: [],
    createdAt: "2053-05-22T14:00:00Z",
  },
  {
    id: "v15",
    authorName: "Mom",
    authorAvatarUrl: null,
    type: "TEXT",
    title: null,
    body:
      "<p>My darling Olivia. You called me yesterday and said the words I've been waiting to hear since you were six and announced you were going to marry the boy down the street.</p>" +
      "<p>I'm so happy for you. He's lucky and I think he knows it.</p>" +
      "<p>Welcome to the next chapter. I love you both already.</p>",
    media: [],
    createdAt: "2056-02-14T11:00:00Z",
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
