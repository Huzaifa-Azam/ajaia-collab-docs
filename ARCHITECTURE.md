# Architecture note

## What I prioritized

With a 225-minute timebox, I aimed for a small product that is **trustworthy** rather than a wide one that is fragile. Three things got the most depth:

1. **Editing you can rely on.** Autosave with a visible status, retry on network errors, a flush when you leave the page, and a version check so one person's save can't silently erase another's.
2. **Access control that is real.** Sharing is enforced on the server for every request, not just by hiding buttons. One permission module decides everything, and it is unit-tested.
3. **Safe file handling.** Imports are converted on the server, checked by type, size, encoding and file signature, and sanitized before they are stored.

**On the stretch work.** The brief suggests "one small enhancement". Viewer/editor roles were part of the sharing design from the start. Once the core was done and verified, I added two more:

- **Presence with new-version notices.** It completes the concurrency story: people learn about a newer version before they hit a conflict.
- **Export.** It was cheap because content is already HTML.

I also prototyped **version history** (preview and restore) but deliberately didn't ship it, to keep the scope tight. It's on the `feature/version-history` branch. Everything else (real login, character-level co-editing, comments) was cut and is listed at the end.

## Shape of the system

```
Browser (Next.js + React, Tiptap editor)
   │  fetch JSON / multipart          signed HTTP-only session cookie
   ▼
Route handlers  src/app/api/*         validate input (zod), resolve user from cookie
   │
   ▼
Service layer   src/lib/documents.ts  every operation: load doc + caller's role → assertAccess()
   │                 │
   │                 └─ src/lib/permissions.ts   owner / editor / viewer rules (pure)
   ▼
Postgres (Neon) via Drizzle ORM       users · documents · document_shares
```

One Next.js app serves both the UI and the API, so there is one thing to deploy and one place for types. Pages are server-rendered with the same service functions the API uses, so a page can never show something the API would refuse.

## Data model

| Table | Key columns | Notes |
|---|---|---|
| `users` | `id`, `email` (unique), `name` | Seeded demo accounts |
| `documents` | `id`, `owner_id`, `title`, `content`, `version`, `updated_at` | Ownership lives on the document row |
| `document_shares` | (`document_id`, `user_id`) primary key, `role` (`viewer` / `editor`) | One row per person a document is shared with |
| `document_presence` | (`document_id`, `user_id`) primary key, `last_seen_at` | One row per person with the document open, refreshed by heartbeats |

`documents.last_edited_by` records who saved last, so others can be told "Bob saved new changes".

Foreign keys cascade, so deleting a document removes its shares. Migrations are plain SQL in `drizzle/`.

## Key decisions and tradeoffs

**Content is stored as sanitized HTML, not ProseMirror JSON.** HTML is the editor's native import/export format, and it is what the file converters (mammoth for `.docx`, marked for Markdown) produce, so import needs no extra transformation step. Every write goes through one allowlist (`sanitize.ts`) that matches exactly what the editor can display, so stored content can never carry scripts, whatever the client sends. *Tradeoff:* real-time co-editing (CRDTs such as Yjs) would need a structured format, so that feature would mean a storage migration.

**Optimistic concurrency instead of real-time collaboration.** Each content save sends the `version` it started from, and the update only applies `WHERE version = baseVersion`. If someone else saved first, the server returns **409** and the editor stops saving and asks you to reload. That is far simpler than live co-editing and still prevents the worst outcome, silently losing someone's work. Renames don't bump the version, so renaming never conflicts with typing.

**Presence by polling, not sockets.** Each open editor sends a heartbeat every 10 seconds, and anyone seen in the last 30 seconds is shown as present. The same response carries the document's current version and who saved it last. So within seconds of a save, editors get a "Show latest" prompt and viewers' copies update on their own, instead of finding out through a conflict. Polling fits Vercel's serverless model, which has no long-lived connections. *Tradeoff:* up to about 10 seconds of delay, and one small request every 10 seconds per open editor. Closing the editor sends a "leaving" request, so people disappear straight away rather than after the 30-second window.

**Simulated login, real authorization.** Reviewers pick a seeded account; the server issues an HS256-signed, HTTP-only, `SameSite=Lax` cookie. Every request resolves the user from that cookie on the server, and every document operation runs `assertAccess()`. Documents that aren't shared with you return **404, not 403**, so IDs can't be probed. A real identity provider would replace only `auth/session.ts` and the login page.

**A small, explicit sharing model.** Owner plus two roles: editors can edit and rename, viewers can only read, and only the owner can share, change roles, remove people or delete. Sharing is by the email of an existing account. Adding someone who already has access just updates their role (an upsert), so the API stays idempotent.

**Import on the server.** The browser checks type and size for instant feedback, but the server repeats every check: extension, 2 MB limit (Vercel functions cap request bodies at 4.5 MB), the zip signature for `.docx`, strict UTF-8 for text, then conversion and sanitizing. Errors map to proper status codes (415, 413, 400) and readable messages. The file becomes a **new** document titled after the file, which I judged the most useful import behaviour for a docs product.

**Consistent errors.** The API always answers `{ error: { code, message } }`. Known failures throw `AppError` with a user-facing message; anything unexpected is logged and returned as a generic 500. The UI shows these messages inline, and pages have an error boundary and a not-found page.

**Stack.** Next.js 16 and TypeScript; Tiptap 3 (ProseMirror-based, headless, so the toolbar is ours); Drizzle with postgres.js (typed SQL, migrations in the repo); Neon Postgres on its free plan. I chose Neon over Supabase because free Supabase projects pause after a week without activity and need restoring by hand, which risks reviewers opening a dead demo. Neon wakes up on the first request, and the brief allows simulated users, so Supabase Auth wasn't needed.

## Deliberately not built

| Cut | Why |
|---|---|
| Character-level real-time co-editing | Merging two people's keystrokes needs a CRDT (such as Yjs) and a persistent socket server, which Vercel functions can't hold. Presence, new-version notices and the version check cover awareness and safety. |
| Real authentication | The brief allows simulated users. The session boundary is isolated, so a real provider is a contained change. |
| Comments and suggestions | Valuable, but a feature in its own right. I preferred finishing the core flows properly. |
| Shipping version history | Prototyped on `feature/version-history`: a snapshot per editing session, preview, and restore as a versioned save. Left unshipped to keep the scope tight. |
| Attachments, images and tables in documents | Need blob storage and a bigger editor schema. Imports keep text and formatting only. |
| Public link sharing, notifications | Outside "share with another user". |
| Browser end-to-end tests | Unit tests cover the riskiest logic, and an HTTP smoke test covers the flows end to end. The UI was checked by hand in a browser (see AI_WORKFLOW.md). CI runs typecheck, lint, unit tests and a build on every push. |

## With another 2-4 hours

1. **Version history:** finish and ship the prototype on `feature/version-history`. It needs a review of the snapshot rules with real usage, plus pruning of old versions.
2. **Playwright end-to-end test** of the share flow in a real browser: Alice shares with Bob, Bob edits, Carol is read-only.
3. **Character-level co-editing:** Yjs through a hosted provider (such as Liveblocks or Y-Sweet), replacing the version check and polling.
4. **Comments** anchored to a text selection.
5. **Real sign-in** (email magic link) and rate limiting on the import endpoint.
