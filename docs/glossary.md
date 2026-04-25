# untilThen — Nomenclature

This is the canonical glossary. When writing user-facing copy or
explaining the product, use these terms exactly. The data-model
identifiers in code (Prisma models, route paths, types) lag the
copy by a deliberate amount — see "Code identifiers" at the
bottom.

---

## User-facing terms

### Vault

The top-level container belonging to a user. There is **one Vault
per user account**. It's the home for everything they're keeping
for the future — a long-lived library that follows them across the
product. Lock / unlock state lives at this level. Subscription
gating attaches to the Vault.

### Time Capsule

A long-form sealed container that lives **inside the Vault**.
A user can have **many Time Capsules** in their Vault. Each Time
Capsule is dedicated to a specific person or moment and is opened
all at once on a future reveal date.

Time Capsules don't have to be for children. Common uses:
- Letters to your kid for their 18th birthday
- A capsule for yourself to open in 10 years
- A capsule for a spouse / partner on a future anniversary
- A capsule about a moment ("the year we moved", "the year we lost
  Dad") not tied to any one person

A Time Capsule has a reveal date, a delivery time, a timezone,
optional cover image, and contains Collections and individual
Entries.

### Collection

An optional grouping inside a Time Capsule. Lets the owner shape
the reveal — e.g. "Your first year", "Letters from Mom", "Notes I
wrote when you were sick". Entries can live directly inside a
Time Capsule or be filed into a Collection. Collections have
their own optional reveal date that must be on or before the
Time Capsule's reveal date.

### Entry / Memory

An individual letter, photo, voice note, or video inside a Time
Capsule (and optionally inside a Collection within that Time
Capsule). The smallest unit of content in the Vault.

### Gift Capsule

A separate product from the Vault. A standalone capsule organised
by one person FOR another (the recipient), opened on a specific
occasion — birthday, anniversary, retirement, graduation, wedding.
Contributors are invited by email to write a message, attach a
photo, or record a voice note. One-time $9.99 charge per Gift
Capsule. Has a single reveal date and dispatches a recipient
email on that date.

Gift Capsules are **NOT** part of the Vault. They have their own
status machine (DRAFT → ACTIVE → SEALED → REVEALED) and their
own organiser dashboard.

---

## Things we don't say anymore

- **"Child's vault"** — say "Time Capsule" instead
- **"Your child's memory capsule"** — say "your Time Capsule"
- **"Add a child"** — say "Create a Time Capsule"
- **"The vault"** (when meaning a per-child container) — say "the
  Time Capsule"
- **"Vault for [name]"** — say "Time Capsule for [name]"

The word "child" is fine when it's literally referring to a child
person (e.g. Time Capsule subject demographic, child-related
features, recipient's actual age). It's not a synonym for
"Time Capsule".

---

## Quick reference

| Concept | What users see | What lives inside |
| --- | --- | --- |
| Vault | Top-level account library | Time Capsules |
| Time Capsule | Long-form sealed container | Collections, Entries |
| Collection | Optional grouping | Entries |
| Entry / Memory | Single letter/photo/voice/video | (leaf) |
| Gift Capsule | Standalone occasion gift (separate from Vault) | Contributions from invitees |

---

## Code identifiers (lagging — Pass 2)

The Prisma schema still uses the legacy names:

- `model Child` — represents the subject of a Time Capsule (the
  person it's about). Holds name, birthday, etc.
- `model Vault` — what users now call a "Time Capsule". Each
  `Vault` row is one Time Capsule.
- `model Collection` — Collection (matches the user-facing term).
- `model Entry` — Entry / Memory.
- `model MemoryCapsule` — Gift Capsule. (Rename pending.)
- Route paths like `/vault/[childId]` and `/api/dashboard/vault`
  still use the old names.

A future "Pass 2" rename will bring code identifiers in line with
the user-facing copy. Until then, when reading code:

- Anything called `Vault` in code === a single **Time Capsule** in
  user copy.
- Anything called `Child` in code === the **subject of the Time
  Capsule** (a person it's for). Not necessarily a child.
- The user's "Vault" (top-level library) doesn't have its own
  Prisma model yet — it's implied by the User row plus the set of
  `Vault` rows that user owns.
- Anything called `MemoryCapsule` in code === **Gift Capsule** in
  user copy.

When writing new user-facing copy, do not borrow the code
nomenclature. Always use the glossary terms above.
