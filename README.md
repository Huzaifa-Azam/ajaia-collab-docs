# Ajaia Docs

A lightweight collaborative document editor: create and format documents in the browser, import files, and share them with other people as editors or viewers.

**Live:** https://ajaia-collab-docs-one.vercel.app. Sign in with any demo account; there are no passwords:

- `alice@example.com`
- `bob@example.com`
- `carol@example.com`

Reviewers: start with [SUBMISSION.md](SUBMISSION.md). Design notes are in [ARCHITECTURE.md](ARCHITECTURE.md), and AI usage in [AI_WORKFLOW.md](AI_WORKFLOW.md).

![Editor showing who else is here and a "new changes" notice](docs/screenshots/05-presence-and-update-notice.png)

## Features

- **Documents:** create, rename, delete and reopen. The home page separates *My documents* from *Shared with me*, with the owner, your access level and who edited last.
- **Editor:** bold, italic, underline, strikethrough, headings 1-3, bulleted and numbered lists, quotes and undo/redo, from the toolbar or keyboard shortcuts.
- **Autosave:**
  - saves about a second after you stop typing, or straight away with `Ctrl+S`
  - shows a visible save status
  - rejects a save based on an outdated copy, so nobody's work is silently overwritten
- **Sharing:** the owner shares by email as *Can edit* or *Can view*, changes roles and removes access. The API enforces this, not just the UI.
- **Import:** turn a file into a new document (formats below).
- **Stretch:** presence ("Bob is here too") with "new changes" notices, and export to Markdown or PDF.

### Supported import formats

| Format | Notes |
|---|---|
| `.txt` | UTF-8 text; blank lines become paragraphs |
| `.md` / `.markdown` | Headings, emphasis, lists, quotes, code and links |
| `.docx` | Text, headings, emphasis and lists. Images and tables aren't imported |

Files up to **2 MB**. Any other type is rejected with a clear message.

## Run locally

You need Node.js 20.9 or newer (tested on 22) and a Postgres database. A free [Neon](https://neon.tech) database works, or a local Postgres 14+.

```bash
npm install
cp .env.example .env.local      # PowerShell: Copy-Item .env.example .env.local
```

Set two values in `.env.local`:
- `DATABASE_URL`: your Postgres connection string
- `SESSION_SECRET`: 32 or more random characters

Then:

```bash
npm run db:setup    # creates the tables, then seeds the demo accounts and documents
npm run dev         # http://localhost:3000
```

Other scripts: `npm run lint`, `npm run typecheck`, `npm run db:migrate`, and `npm run db:generate` after changing `src/lib/db/schema.ts`.

## Tests and CI

```bash
npm test                    # 53 unit tests (no database needed)
npm run smoke               # 40 end-to-end HTTP checks against http://localhost:3000
npm run smoke -- https://ajaia-collab-docs-one.vercel.app    # the same checks against the live site
```

- **Unit tests** cover:
  - the permission rules, including 404 rather than 403 for documents you can't see
  - file import, including a real `.docx` and malicious HTML
  - validation and export
- **The smoke test** signs in as all three accounts and drives the real API. It checks saving, the rejection of outdated saves, every role's permissions, sharing, presence and import, then deletes what it created.
- **CI** (GitHub Actions) runs typecheck, lint, the unit tests and a production build on every push.

After testing by hand, `npm run db:reset-demo` puts the demo documents back to their original state.

## Deploy

The live demo runs on Vercel (free Hobby plan) with Neon Postgres (free plan):

1. Create a Neon project and copy its pooled connection string.
2. Import the GitHub repo in Vercel, and set `DATABASE_URL` and `SESSION_SECRET`.
3. Run `npm run db:setup` once against that database.

`vercel.json` pins the functions to Singapore (`sin1`), next to the database.

## Project layout

```
src/
  app/                  pages (login, documents, editor) and API routes under app/api
  components/           UI: editor and toolbar, share dialog, import button, ...
  lib/
    permissions.ts      who can do what (pure, unit-tested)
    documents.ts        document and sharing queries, every one access-checked
    presence.ts         who has a document open, plus new-version detection
    importer.ts         file to sanitized HTML
    sanitize.ts         HTML allowlist, applied on every write
    validation.ts       request schemas (zod)
    auth/session.ts     signed session cookie
    db/                 Drizzle schema and client
drizzle/                SQL migrations
scripts/                seed data and the smoke test
tests/                  unit tests
```
