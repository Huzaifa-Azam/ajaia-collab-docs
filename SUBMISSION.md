# Submission: Ajaia Docs

## Links

| | |
|---|---|
| Live app | LIVE_URL_PLACEHOLDER |
| Source code | https://github.com/Huzaifa-Azam/ajaia-collab-docs |
| Walkthrough video | see [VIDEO_URL.txt](VIDEO_URL.txt) |

## Test accounts

No passwords. On the sign-in page, click an account. Use a private window to be signed in as two people at once.

| Account | Email | Use it to check |
|---|---|---|
| Alice Johnson | alice@example.com | Owner view: sharing, roles, delete |
| Bob Martinez | bob@example.com | Editor view: can edit Alice's welcome doc |
| Carol Chen | carol@example.com | Viewer view: read-only access |

## Reviewing the sharing flow in two minutes

1. Open the live app and continue as **Alice**. *My documents* lists her two documents; *Shared with me* shows Bob's retro notes as view-only.
2. Create a document, type a few lines with some formatting, and watch the status change to *All changes saved*. Reload: everything is still there.
3. Click **Share**, add `carol@example.com` as **Can view**, and `bob@example.com` as **Can edit**.
4. In a private window, continue as **Carol**. The document appears under *Shared with me* marked *View only*. Opening it shows a read-only editor.
5. Continue as **Bob** instead. He can edit, and Alice sees his changes after a reload.
6. Back as Alice, change Carol to **Can edit** or remove her, and refresh Carol's window.

## What's included

| Item | Description |
|---|---|
| `README.md` | Features, supported file types, local setup and run instructions, tests, deployment |
| `ARCHITECTURE.md` | Architecture note: what I prioritized, key decisions and tradeoffs, what I cut |
| `AI_WORKFLOW.md` | AI workflow note: tools, where AI helped, what I changed or rejected, how I verified |
| `SUBMISSION.md` | This file |
| `VIDEO_URL.txt` | Link to the 3-5 minute walkthrough video |
| `src/`, `tests/`, `drizzle/`, `scripts/` and config files | Full source code, test suite, SQL migrations and seed script |

## Status

### Working end to end

- Create, rename, edit, delete and reopen documents, with autosave and a save-status indicator
- Rich text: bold, italic, underline, strikethrough, headings 1-3, bulleted and numbered lists, quotes, undo/redo
- Import `.txt`, `.md` and `.docx` (up to 2 MB) as new documents, with formatting kept and clear errors for anything else
- Sharing with **Can edit** / **Can view** roles, role changes and removal, enforced by the API, not just the UI
- Separate *My documents* and *Shared with me* lists showing owner and access level
- Overwrite protection: a save based on an outdated copy is rejected (409) and the editor asks you to reload
- Persistence in Postgres (Neon), deployed on Vercel
- 46 automated tests (`npm test`)

### Deliberately not built

Real-time co-editing, real authentication, comments, version history, attachments and images, public link sharing. The reasons are in [ARCHITECTURE.md](ARCHITECTURE.md#deliberately-not-built).

### Known limitations

- Two people editing at the same moment don't see each other's changes live. The second person to save is told to reload, so no work is silently lost, but it isn't merged automatically either.
- `.docx` import keeps text, headings, emphasis and lists, but not images, tables or page layout.
- Anyone with the demo URL can sign in as any demo account, by design for review.

### With another 2-4 hours

1. Version history with restore
2. Playwright end-to-end test of the share flow
3. Export to Markdown / PDF
4. Presence indicators ("Bob is viewing")
5. Real sign-in (email magic link) and rate limiting on uploads
