# AI workflow note

## How I worked: one agent, with me directing

I used **Claude Code** (Anthropic's coding agent, running Claude Opus 5.5 in the Claude desktop app) as an **autonomous agent**, not just a chat assistant. It worked directly in the project with a terminal, git and a browser, and carried whole tasks end to end:

- scaffolding and building features
- writing and running tests
- deploying, checking CI and smoke-testing the live site

My role was direction and judgment:

- **Plan first, then delegate whole tasks.** The agent turned the brief into a time-boxed plan and task list. I approved it, then handed over complete tasks, for example "sharing with server-side permissions, with tests". I reviewed the results: the diffs, the test output and the running app.
- **I kept the decisions that matter:** scope, stack, what to deprioritize, and anything outward-facing.
- **Accounts and credentials stayed with me:**
  - I created the GitHub, Vercel and Neon accounts myself.
  - Credentials never went through the chat. I pasted the database URL into the settings myself, and the agent generated the session secret straight into the git-ignored env file.
  - Before submission, the agent audited the whole git history to prove no secret was ever committed.
- **Background work in parallel:** long checks, such as the full CI pipeline in a fresh clone, ran in the background while the agent carried on with other tasks.
- **Course corrections:** I redirected it several times. For example, I paused feature work to check the submission against the brief's constraints and evaluation criteria.

## Where it materially sped up the work

- **From brief to plan in minutes,** and a live deployment within the first hour.
- **Most of the roughly 3,000 lines** of code, tests and scripts. The core flows passed a production build within the first hour, which left time for the parts that need judgment: concurrency, permissions and testing.
- **Tests I wouldn't have had time to write by hand:**
  - the full permission matrix
  - import edge cases, including a real `.docx` built in memory
  - a 40-check end-to-end smoke test that runs against the live site
- **Debugging:**
  - an npm dependency conflict
  - an expired GitHub credential
  - a database-driver problem it confirmed by reading the driver's source rather than guessing

## What I changed or rejected

1. **Supabase, replaced by Neon and seeded accounts.** Free Supabase projects pause after a week without use, which risked a dead demo for reviewers. Real sign-in wasn't required.
2. **Neon's ready-made agent setup prompt, rejected.** It would have installed a global CLI and changed project config, when all we needed was a connection string.
3. **Template defaults, turned off.** Next.js 16's caching features add complexity for pages that are all per-user and dynamic.
4. **Dependency versions, corrected.** npm picked postgres.js v4, but Drizzle's adapter targets v3, so I pinned v3.
5. **Scope, re-checked against the brief.** Partway through, I parked the version history prototype on a branch instead of shipping another enhancement, and spent the time on CI and polish.
6. **Fixes that came from testing, not the first draft:**
   - the browser tab title
   - the wording of the conflict message
   - the cursor jumping after loading someone else's changes
   - a Markdown export bug, caught by its unit test
   - Enter in a new document's title not moving the cursor into the body in background tabs
   - the database and the functions running on different continents
   - images in imported files vanishing without a trace. I found this by importing a Word file with a picture. They now leave a visible note, and the UI says images aren't imported

## How I verified correctness, UX and reliability

- **Before every push:** strict TypeScript, lint and a production build. CI repeats them on GitHub; I first ran the pipeline in a fresh clone.
- **Automated tests:** 56 unit tests, plus a 40-check end-to-end smoke test that passes locally and against the live site.
- **Manual testing in a real browser** as each account:
  - formatting survives a reload (exact HTML compared)
  - the viewer's editor is truly read-only
  - two tabs editing the same document: the second save is rejected with a clear banner
  - presence and "Show latest"
  - import errors
  - phone-width layout
  - PDF output, rendered with print styles in headless Edge
- **One deliberate check:** opening a document must not save it, or two readers would conflict. I confirmed the stored version doesn't change when a document is opened.

**Not verified:** no automated browser tests; tested in one browser engine (Chromium); no load testing; accessibility checked only informally.

## Scaling up: multiple agents on a bigger task

This task was small and tightly coupled: one database schema, one UI. A single agent with fast feedback loops was the efficient choice; coordinating several would have cost more in merging than it saved. On a bigger project I'd split the work across agents the way I'd split it across a team:

- **Parallel builders on independent workstreams** (for example import, sharing and permissions, editor UX). Each works in its own git worktree and branch, and merges through pull requests gated by CI.
- **A reviewer agent** with fresh context, checking each diff for bugs and security issues.
- **A verifier agent** running the end-to-end and browser tests.
- **Me as the coordinator:** owning the plan, the shared contracts (API shapes and the database schema), and the merge and deploy decisions.
