# AI workflow note

## Tools

- **Claude Code** (Anthropic's coding agent, running Claude Opus 5.5 in the Claude desktop app) was the main tool. It worked directly in the project folder: it proposed the plan, wrote the code, ran the build, tests and database scripts, and drove a built-in browser to test the UI.
- The surrounding services were used directly: GitHub, Vercel, Neon.

I used it as a fast pair programmer and kept the product calls: what to build in 225 minutes, what to cut, which stack, and whether each result was good enough to keep.

## Where AI materially sped up the work

- **From brief to plan.** It turned the open-ended prompt into a scoped plan with a minute-by-minute budget: core flows first, a deploy in the first 20 minutes, explicit cuts.
- **Building the bulk of the code.** About 3,100 lines across the app, tests and scripts, including the API routes, data layer, Drizzle schema and migrations, Tiptap toolbar and share dialog. The core app compiled and passed a production build within the first hour. That left time for the parts that need judgment: concurrency, permissions and testing, and then two stretch features.
- **Tests I wouldn't have had time to write by hand.** These cover the full permission matrix and import edge cases. One test builds a real `.docx` in memory, so the Word conversion is tested for real rather than mocked. It also wrote a 40-check HTTP smoke test that runs against the live site.
- **Debugging.** It worked through three problems:
  - an npm peer-dependency conflict (Vitest 5 needs newer Node types)
  - an expired GitHub credential that blocked the first push
  - a database-driver issue it found by reading the driver's source, described below.

## What I changed or rejected

1. **Supabase, rejected in favour of Neon and seeded accounts.** Supabase was my first instinct. Free Supabase projects pause after a week without activity, so reviewers could open a dead demo. Real login would also cost time the brief doesn't ask for. I switched to Neon, which wakes up by itself, and simulated users.
2. **Neon's suggested setup prompt, rejected.** Neon's console offered a ready-made agent prompt that installs a global CLI, adds Neon config files and may switch the database driver. The app only needed a connection string, so I skipped it.
3. **Next.js 16 scaffold defaults, turned off.** The template enabled Cache Components and partial prefetching. Every page here is per-user and dynamic, so they added complexity for no benefit.
4. **Dependency versions corrected.** npm resolved postgres.js v4, but Drizzle's adapter targets v3, so I pinned v3 rather than trusting "latest".
5. **Storage format.** I considered storing ProseMirror JSON and chose sanitized HTML instead, because it keeps import, export and server-side sanitizing simple (see ARCHITECTURE.md).
6. **Restructured for testability.** The first draft had the 404-vs-403 rule inline in the data layer. I moved it into a pure `assertAccess()` function so it could be unit-tested rather than trusted.
7. **Database URL handling.** Neon's connection string includes `channel_binding=require`. Rather than assume the driver handles it, it read postgres.js's source and confirmed that unknown URL options are forwarded to the server as settings, which Postgres rejects. I added a small normalizer, with a test.
8. **Fixes that came from testing, not from the first draft:**
   - The browser tab didn't show the document's name. Fixed with `generateMetadata`.
   - The conflict banner blamed "someone else" even when the conflict came from the same person's second tab. Reworded.
   - Vercel's functions defaulted to Washington, D.C. while the database is in Singapore. Every query would cross the Pacific, so I pinned the functions to Singapore.
   - After "Show latest" loaded someone else's changes, the cursor jumped to the top of the document. It now stays roughly where it was.
   - The first version of the Markdown export put a stray indented blank line after every list item. The unit test written for it failed on its first run, and I fixed the list rule.

## How I verified correctness, UX quality and reliability

- **Types and build:** strict TypeScript, and a production `next build` passing before each push.
- **Unit tests:** 53 Vitest tests covering:
  - the permissions matrix
  - the import pipeline, including a real `.docx` and XSS stripping
  - request validation and sanitizing of editor saves
  - Markdown export, including a round trip through the importer
- **End-to-end smoke test:** `npm run smoke` signs in as all three demo accounts and drives the real API. 40 checks covering:
  - saving and the 409 on a stale save
  - every role's allowed and forbidden actions, sharing and removal
  - presence and new-version notices
  - forged cookies, sanitizing and import

  It passes **40/40 locally and against the live deployment**.
- **Manual testing in a real browser**, as each account:
  - formatted text with the toolbar and shortcuts, watched the autosave status, reloaded and compared the exact saved HTML
  - used the share dialog, including its error state for an unknown email
  - confirmed the viewer's editor is locked (not editable, no toolbar, no Share button)
  - edited one document in two tabs and confirmed the second save was rejected with the conflict banner
  - imported a Markdown file and had a PDF refused
  - checked the layout at phone width (no sideways scrolling)
  - with Alice's editor open, had a second session as Bob open and save the same document:
    - Alice's header showed Bob within one heartbeat
    - the "Bob Martinez saved new changes" banner appeared
    - "Show latest" loaded his change
    - Alice's next edit then saved without a conflict
- **A specific check:** the editor adds an empty trailing paragraph. If that counted as an edit, merely *opening* a document would save it and cause false conflicts for anyone else with it open. I compared the stored version before and after reloading: it didn't change.

**Not verified:** there are no automated browser tests, and I tested in one browser engine (Chromium). I didn't load-test. Accessibility was checked informally (labels, keyboard use, focus) but not audited. The PDF export relies on the browser's print dialog and a print stylesheet; its output was checked by printing by hand rather than by an automated test.
