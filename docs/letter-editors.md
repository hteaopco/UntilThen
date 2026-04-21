# Letter Editor Surfaces

Keep these in sync. Any chrome change (prompt banner wording, scroll rail,
Expand/Collapse controls, media attachment card, submit button language, etc.)
needs to land on **every** surface in this list or the UX drifts.

All four surfaces share the same visual building blocks:

- **Prompt card** — amber-bordered writing card with a pale-blue
  instruction banner ("Write something meaningful.") + tone-specific hint
  from `TONE_EDITOR_HINT` / generic equivalent
- **Tiptap editor** — `@/components/editor/TiptapEditor` with `Dear
  {firstName},` placeholder
- **Scroll indicator rail** — amber gradient + dashed tail on the right
  side of the editor
- **Expand / Collapse** buttons + "Write as much as you'd like." footer
- **Media card** — shared `MediaAttachments` component in a white card
  below the writing card
- **Actions** — bottom-right primary submit with Cancel to its left (on
  authenticated surfaces; public contributor uses a centered single CTA)

## Surfaces

1. **Public gift capsule contributor**
   `src/app/contribute/capsule/[token]/CapsuleContributeForm.tsx`
   The reference implementation. Public, token-authenticated. Posts to
   `/api/contribute/capsule/[token]` (→ `CapsuleContribution`).
   Media via `PublicMediaAttachments` (same shape as MediaAttachments but
   calls the unauthenticated upload endpoints).

2. **Vault memory editor** (parent writing to their own child's vault)
   `src/app/vault/[childId]/new/MemoryEditorForm.tsx`
   Clerk-auth. Posts to `/api/dashboard/entries` (→ `Entry`). Has a
   collection picker dropdown (vault's Main Capsule Diary by default, or
   any of the vault's Collections). Media via
   `@/components/editor/MediaAttachments` with `target="entry"`.

3. **Gift capsule organiser self-contribution**
   `src/app/capsules/[id]/CapsuleOverview.tsx` → `OwnContribution`
   component (inside the file). Clerk-auth. Lets the organiser add
   their own message to a capsule they created. Posts to
   `/api/capsules/[id]/contributions` (→ `CapsuleContribution` with the
   organiser's `clerkUserId`). Media via `MediaAttachments` with
   `target="capsuleContribution"`.

4. **Private child-vault contributor** (invited contributor, not
   organiser)
   `src/app/contribute/[vaultId]/new/ContributorEntryForm.tsx`
   Clerk-auth (contributor flow). Posts to `/api/contribute/entries`
   (→ `Entry` with `contributorId` set). Media via
   `MediaAttachments` with `target="entry"`.

## Shared building blocks (edit these to propagate)

- `src/components/editor/TiptapEditor.tsx` — the actual Tiptap instance
- `src/components/editor/MediaAttachments.tsx` — authed media uploader
  (used by surfaces 2, 3, 4)
- `src/app/contribute/capsule/[token]/PublicMediaAttachments.tsx` —
  public variant (surface 1)
- `src/lib/tone.ts` — `TONE_EDITOR_HINT` map that drives the prompt
  banner copy per `CapsuleTone` (used on surfaces 1 + 3)

## When you change one editor

1. Port the change to the other three. Don't leave drift.
2. Update this doc if you add/rename a surface.
3. If the change touches media attachments, verify both
   `MediaAttachments` and `PublicMediaAttachments` render consistently.
