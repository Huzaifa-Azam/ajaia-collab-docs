# Ajaia Docs: submission

A lightweight collaborative document editor: write and format documents in the browser, import files, and share them with others as editors or viewers.

| | |
|---|---|
| **Live app** | https://ajaia-collab-docs-one.vercel.app |
| **Source code** | https://github.com/Huzaifa-Azam/ajaia-collab-docs (also in this folder as a zip) |
| **Walkthrough video** | link in `VIDEO_URL.txt` |

## Test accounts

No passwords. On the sign-in page, click an account. To be two people at once, use a private window for the second account.

| Account | Email | In the demo data |
|---|---|---|
| Alice Johnson | alice@example.com | Owns "Welcome to Ajaia Docs" |
| Bob Martinez | bob@example.com | Can **edit** Alice's welcome doc |
| Carol Chen | carol@example.com | Can only **view** it |

## Try it in two minutes

1. Sign in as **Alice**. Note the two lists: *My documents* and *Shared with me*.
2. Click **New document**. Name it, type a few lines with some formatting, and watch the status change to *All changes saved*. Reload: everything is still there.
3. Click **Import file** and choose a `.docx`, `.md` or `.txt` file (up to 2 MB). It opens as a new document. Any other file type gets a clear error.
4. Click **Share**. Add `bob@example.com` as *Can edit* and `carol@example.com` as *Can view*.
5. In a private window, sign in as **Carol**. The document is under *Shared with me*, and it's read-only.
6. Switch that window to **Bob** and open the same document. Each of you can see the other is there. When Bob types, Alice is told "Bob Martinez saved new changes" with a **Show latest** button.

## Scope

I treated the five required areas as the product and built each one end to end, choosing the smallest version that still feels real:

- **Sign-in** is simulated with seeded accounts, so the time went into real server-side permissions.
- **File upload** does one thing well: it turns a `.txt`, `.md` or `.docx` file into a new document.
- **Sharing** is by email, with two roles.
- **Live co-editing** was intentionally deprioritized. Every save carries a version instead, so nobody's work is silently overwritten.

Only after the core was verified did I add two small stretch enhancements, presence and export, and I stopped there. Version history stays a prototype on a branch. The reasoning behind each choice is in [ARCHITECTURE.md](ARCHITECTURE.md).

## Status

**Working end to end**
- Create, rename, edit, delete and reopen documents, with autosave
- Rich text: bold, italic, underline, headings, bulleted and numbered lists
- Import of `.txt`, `.md` and `.docx` files
- Sharing with *Can edit* / *Can view*, enforced by the API, not just the UI
- Separate *My documents* and *Shared with me* lists
- Persistence in Postgres, and deployment on Vercel
- Stretch: presence with "new changes" notices, and export to Markdown or PDF

**Quality:** 53 unit tests, a 40-check end-to-end smoke test that passes against the live site, and CI on every push (typecheck, lint, tests, build).

**Known limitations**
- Simultaneous edits aren't merged. Others hear about a newer version within about 10 seconds, and a save based on an outdated copy is rejected rather than overwriting it. But merging is manual.
- `.docx` import keeps text, headings, emphasis and lists, but not images or tables.
- Sign-in is simulated, so anyone with the link can use any demo account.

**Next, with another 2-4 hours**
1. Ship version history (the prototype is on the `feature/version-history` branch)
2. A Playwright browser test of the sharing flow
3. Real sign-in (email magic link) and rate limits on uploads
4. Live co-editing with Yjs, replacing the version check

## What's in this folder

| Item | What it is |
|---|---|
| `SUBMISSION.md` | This file |
| `LIVE_URL.txt` | Live product URL and test accounts |
| `VIDEO_URL.txt` | Walkthrough video link |
| `README.md` | Features, local setup and run instructions, tests, deployment |
| `ARCHITECTURE.md` | Architecture note: scope choices, design decisions and tradeoffs |
| `AI_WORKFLOW.md` | AI workflow note |
| `screenshots/` | 8 screenshots of the live app |
| `ajaia-collab-docs-source.zip` | Full source code, identical to the GitHub repository |
