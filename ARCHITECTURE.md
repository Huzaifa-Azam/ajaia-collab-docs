# Architecture note

## Scope and priorities

I treated the five required areas as the product and built each one end to end, choosing the smallest version that still feels real. Only after the core was verified did I add two small stretch enhancements, presence and export, and I stopped there. Version history stays a prototype on the `feature/version-history` branch.

| Area | What I chose | Why |
|---|---|---|
| Users | Seeded accounts with simulated sign-in (the brief allows this) | The time went into real, server-side permission checks |
| File upload | One mode: `.txt` / `.md` / `.docx` becomes a new document, up to 2 MB | The most useful of the brief's suggested options, done safely: type, size and signature checks, then sanitizing |
| Sharing | By email, to existing accounts, with two roles (*Can edit* / *Can view*) | Enough to show ownership and access rules clearly |
| Collaboration | Live co-editing intentionally deprioritized. Every save carries the version it was based on | It gives the safety (no silently lost work) without the heavy infrastructure live co-editing needs |
| Stretch | Presence with "new changes" notices, and export. Version history left as a prototype | Small additions that support the collaboration story, after the core was done |

Other Google Docs features, such as comments, suggestions, images and tables, are out of scope.

## Shape of the system

```
Browser: Next.js + React, Tiptap editor
   │  JSON / multipart over HTTPS, signed HTTP-only session cookie
   ▼
API routes (src/app/api/*)        validate input (zod); resolve the user from the cookie
   ▼
Service layer (src/lib/*.ts)      every operation: load the document and the caller's role,
   │                              then check the action (permissions.ts)
   ▼
Postgres (Neon) via Drizzle       users · documents · document_shares · document_presence
```

One Next.js app serves the UI and the API, so there is one thing to deploy. Pages use the same service functions as the API, so a page can never show something the API would refuse.

## Key decisions and tradeoffs

- **Sanitized HTML as the stored format.**
  - HTML is what the editor and the file converters (mammoth for `.docx`, marked for Markdown) produce, so import and export stay simple.
  - Every write passes through one allowlist that matches what the editor can show, so stored content can't carry scripts whatever the client sends.
  - *Tradeoff:* live co-editing would need a structured format such as Yjs.
- **Versioned saves instead of live co-editing.**
  - A save applies only if the stored version still matches the one the client started from. Otherwise the server returns **409** and the editor asks you to reload, instead of overwriting someone's work.
  - Renames don't change the version, so renaming never conflicts with typing.
- **Presence by polling.**
  - An open editor sends a heartbeat every 10 seconds, and anyone seen in the last 30 seconds is shown as present.
  - The same response carries the current version and who saved it, so others get "Bob saved new changes" before they hit a conflict. Viewers' copies simply update.
  - Polling fits serverless hosting, which can't hold sockets open. *Tradeoff:* up to 10 seconds of delay.
- **Simulated sign-in, real authorization.**
  - Every request resolves the user from a signed, HTTP-only cookie on the server.
  - One permissions module decides every action. Documents that aren't shared with you return **404 rather than 403**, so IDs can't be probed.
  - A real identity provider would only replace the session module and the login page.
- **Import on the server.** The browser checks the type and size for quick feedback, but the server repeats every check: extension, size, the `.docx` file signature, UTF-8 encoding, then conversion and sanitizing. Errors map to proper status codes (415, 413, 400) with readable messages. Images aren't supported. Rather than vanishing silently, each one becomes a visible "[Image not imported: …]" note, and the UI says so under the Import button.
- **Validation and errors.**
  - Every API route validates its input (zod).
  - Failures always come back as `{ error: { code, message } }` with the right status: 400, 401, 403, 404, 409, 413 or 415.
  - The UI shows those messages where they happen: the share dialog, import, and the save status.
  - Pages have error and not-found screens.
- **Hosting.**
  - Vercel and Neon, both on free plans.
  - Neon wakes up by itself after being idle. Free Supabase projects pause after a week and would risk a dead demo.
  - The functions are pinned to Singapore, next to the database, because each page makes several queries.

## Next, with another 2-4 hours

1. Ship version history: review the prototype's snapshot rules and add pruning.
2. A Playwright browser test of the sharing flow.
3. Real sign-in (email magic link) and rate limits on uploads.
4. Live co-editing with Yjs through a hosted provider, replacing the version check and polling.
