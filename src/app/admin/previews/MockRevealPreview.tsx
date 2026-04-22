"use client";

import { X } from "lucide-react";

import {
  RevealExperience,
  type RevealCapsule,
  type RevealContribution,
} from "@/app/reveal/[token]/RevealExperience";

/**
 * Admin-only mock recipient reveal. Renders the same
 * RevealExperience component the production /reveal/[token]
 * route uses — just with seed data + public stock media — so
 * admins can QA the full Entry → Stories → Transition → Gallery
 * flow without needing a real capsule with real contributions.
 *
 * Photos point at public Unsplash CDN URLs (stable, no auth).
 * The voice card uses a public W3C sample MP3 that should play
 * on any modern browser; if it ever 404s the visual still
 * renders, the play button just no-ops.
 */
export function MockRevealPreview({ onExit }: { onExit: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] bg-black">
      <RevealExperience capsule={MOCK_CAPSULE} contributions={MOCK_CONTRIBS} />
      {/*
       * Exit button sits above everything (including StoryCards'
       * own ✕) so admins can always escape the preview, even when
       * the experience itself is in a full-screen takeover phase.
       */}
      <button
        type="button"
        onClick={onExit}
        className="fixed bottom-4 right-4 z-[300] inline-flex items-center gap-2 rounded-full bg-navy text-white px-4 py-2 text-xs font-bold shadow-[0_8px_24px_rgba(0,0,0,0.35)] hover:bg-navy/90 transition-colors"
      >
        <X size={14} strokeWidth={2.25} />
        Exit preview
      </button>
    </div>
  );
}

const MOCK_CAPSULE: RevealCapsule = {
  id: "mock-capsule",
  title: "Olivia's First Birthday",
  recipientName: "Olivia",
  occasionType: "BIRTHDAY",
  tone: "CELEBRATION",
  revealDate: new Date("2032-06-24T09:00:00Z").toISOString(),
  isFirstOpen: true,
  hasCompleted: false,
};

// Stable, hot-linkable Unsplash photos. ?w=800&q=80 keeps the
// payload small while staying sharp on retina story cards.
const PHOTO_BIRTHDAY =
  "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=800&q=80";
const PHOTO_BABY =
  "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=800&q=80";
const PHOTO_FAMILY =
  "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&q=80";

// W3C-hosted public sample. Tiny (~7s) but lets the voice card
// fully demo the play/pause loop.
const VOICE_SAMPLE =
  "https://www.w3schools.com/html/horse.mp3";

const MOCK_CONTRIBS: RevealContribution[] = [
  // Card 1 — photo (story #1)
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

  // Card 2 — letter (story #2)
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

  // Card 3 — voice (story #3)
  {
    id: "m3",
    authorName: "Grandma Rose",
    authorAvatarUrl: null,
    type: "VOICE",
    title: null,
    body: null,
    media: [{ kind: "voice", url: VOICE_SAMPLE }],
    createdAt: "2031-06-24T17:00:00Z",
  },

  // Card 4 — letter, longer body to exercise the expand state
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

  // Card 5 — photo (story #5, last in highlight reel)
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

  // ── Beyond the highlight reel — these only show in Phase 4
  // Gallery, which is what the transition screen advertises.
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
    media: [{ kind: "voice", url: VOICE_SAMPLE }],
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
