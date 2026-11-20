# Submission: Ajaia Docs

## Links

| | |
|---|---|
| Live app | https://ajaia-collab-docs-one.vercel.app |
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
5. Continue as **Bob** instead and open the same document. Each window shows the other person is there ("Alice is here too"). When Bob types, Alice gets "Bob Martinez saved new changes · Show latest" within about 10 seconds.
6. Back as Alice, change Carol to **Can edit** or remove her, and refresh Carol's window.
7. Use **Download** in the editor to export as Markdown or PDF.

## What's included

| Item | Description |
|---|---|
| `README.md` | Features, supported file types, local setup and run instructions, tests, deployment |
| `ARCHITECTURE.md` | Architecture note: what I prioritized, key decisions and tradeoffs, what I cut |
| `AI_WORKFLOW.md` | AI workflow note: tools, where AI helped, what I changed or rejected, how I verified |
| `SUBMISSION.md` | This file |
| `VIDEO_URL.txt` | Link to the 3-5 minute walkthrough video |
| `src/`, `tests/`, `drizzle/`, `scripts/` and config files | Full source code, unit tests, SQL migrations, seed script and end-to-end smoke test |

## Status

### Working end to end

- Create, rename, edit, delete and reopen documents, with autosave and a save-status indicator
- Rich text: bold, italic, underline, strikethrough, headings 1-3, bulleted and numbered lists, quotes, undo/redo
- Import `.txt`, `.md` and `.docx` (up to 2 MB) as new documents, with formatting kept and clear errors for anything else
- Sharing with **Can edit** / **Can view** roles, role changes and removal, enforced by the API, not just the UI
- Separate *My documents* and *Shared with me* lists showing owner and access level
- Overwrite protection: a save based on an outdated copy is rejected (409) and the editor asks you to reload
- Persistence in Postgres (Neon), deployed on Vercel
- **Stretch: presence and live updates.** You can see who else has a document open. Others learn within about 10 seconds that someone saved, with a "Show latest" prompt, and viewers' copies update on their own.
- **Stretch: export** to Markdown, or to PDF through the print dialog
- 53 unit tests (`npm test`), plus a 40-check end-to-end smoke test that passes against the live deployment (`npm run smoke -- <url>`)

### Deliberately not built

Character-level real-time co-editing, real authentication, comments, version history, attachments and images, public link sharing. The reasons are in [ARCHITECTURE.md](ARCHITECTURE.md#deliberately-not-built).

### Known limitations

- Edits made at the same moment aren't merged. Others are told within about 10 seconds that a newer version exists, and a save based on an outdated copy is rejected rather than overwriting it. So no work is lost silently, but merging is manual.
- `.docx` import keeps text, headings, emphasis and lists, but not images, tables or page layout.
- Anyone with the demo URL can sign in as any demo account, by design for review.

### With another 2-4 hours

1. Version history with restore
2. Playwright end-to-end test of the share flow in a real browser
3. Character-level co-editing (Yjs through a hosted provider), replacing the version check
4. Comments on a text selection
5. Real sign-in (email magic link) and rate limiting on uploads
