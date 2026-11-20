/**
 * End-to-end API smoke test against a running app (local dev server or the live deployment).
 * It signs in as the seeded demo accounts, exercises every main flow over real HTTP, and
 * deletes everything it created.
 *
 *   npm run smoke                                            # http://localhost:3000
 *   npm run smoke -- https://ajaia-collab-docs-one.vercel.app
 */

const BASE = (process.argv[2] ?? process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");

type Session = { email: string; cookie: string };
type Result = { status: number; json: any }; // eslint-disable-line @typescript-eslint/no-explicit-any

let passed = 0;
let failed = 0;

function check(label: string, ok: boolean, detail?: unknown) {
  if (ok) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}`, detail === undefined ? "" : JSON.stringify(detail));
  }
}

async function signIn(email: string): Promise<Session> {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    body: new URLSearchParams({ email }),
    redirect: "manual",
  });
  const token = res.headers.get("set-cookie")?.match(/ajaia_session=([^;]+)/)?.[1];
  if (res.status !== 303 || !token) throw new Error(`Signing in as ${email} failed (HTTP ${res.status}). Is the database seeded?`);
  return { email, cookie: `ajaia_session=${token}` };
}

async function call(session: Session | null, method: string, path: string, body?: unknown, form?: FormData): Promise<Result> {
  const headers: Record<string, string> = {};
  if (session) headers.cookie = session.cookie;
  if (body !== undefined) headers["content-type"] = "application/json";
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

function upload(filename: string, contents: string): FormData {
  const form = new FormData();
  form.append("file", new Blob([contents]), filename);
  return form;
}

async function main() {
  console.log(`Smoke test against ${BASE}\n`);
  const created: string[] = [];
  const alice = await signIn("alice@example.com");
  const bob = await signIn("bob@example.com");
  const carol = await signIn("carol@example.com");

  try {
    console.log("Sign-in");
    check("API calls without a session get 401", (await call(null, "GET", "/api/documents")).status === 401);
    const unknown = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      body: new URLSearchParams({ email: "nobody@example.com" }),
      redirect: "manual",
    });
    check(
      "unknown accounts can't sign in",
      unknown.status === 303 &&
        (unknown.headers.get("location") ?? "").includes("error=") &&
        !/ajaia_session=[^;]/.test(unknown.headers.get("set-cookie") ?? ""),
    );
    const forged = { email: "forged", cookie: "ajaia_session=not-a-real-token" };
    check("a forged session cookie is rejected", (await call(forged, "GET", "/api/documents")).status === 401);

    console.log("\nCreate, edit and reopen");
    const create = await call(alice, "POST", "/api/documents", { title: "Smoke test document" });
    check("owner can create a document", create.status === 201 && typeof create.json?.id === "string", create);
    const id: string = create.json.id;
    created.push(id);

    const html = "<h1>Hello</h1><p><strong>bold</strong> <em>italic</em> <u>underline</u></p><ul><li><p>item</p></li></ul>";
    const save = await call(alice, "PATCH", `/api/documents/${id}`, { content: html, baseVersion: 1 });
    check("content saves and the version goes up", save.status === 200 && save.json?.version === 2, save);
    const reopened = await call(alice, "GET", `/api/documents/${id}`);
    check("formatting is identical after reopening", reopened.json?.content === html, reopened.json?.content);

    const stale = await call(alice, "PATCH", `/api/documents/${id}`, { content: "<p>stale copy</p>", baseVersion: 1 });
    check("a save based on an outdated copy is rejected with 409", stale.status === 409, stale);

    const rename = await call(alice, "PATCH", `/api/documents/${id}`, { title: "  Renamed by smoke test  " });
    const afterRename = await call(alice, "GET", `/api/documents/${id}`);
    check(
      "rename trims the title and doesn't change the version",
      rename.status === 200 && afterRename.json?.title === "Renamed by smoke test" && afterRename.json?.version === 2,
      afterRename.json,
    );
    check("an empty title is rejected with 400", (await call(alice, "PATCH", `/api/documents/${id}`, { title: "   " })).status === 400);

    await call(alice, "PATCH", `/api/documents/${id}`, {
      content: '<p onclick="steal()">safe</p><script>alert(1)</script><img src=x onerror=alert(1)>',
      baseVersion: 2,
    });
    const sanitized = await call(alice, "GET", `/api/documents/${id}`);
    check("scripts and event handlers are stripped before storing", sanitized.json?.content === "<p>safe</p>", sanitized.json?.content);

    console.log("\nSharing and permissions");
    check("people it isn't shared with get 404", (await call(bob, "GET", `/api/documents/${id}`)).status === 404);
    check("a malformed document id is a clean 404", (await call(alice, "GET", "/api/documents/not-a-uuid")).status === 404);

    const shareCarol = await call(alice, "POST", `/api/documents/${id}/shares`, { email: "  CAROL@example.com ", role: "viewer" });
    check("owner shares by email (case and spaces don't matter)", shareCarol.status === 200 && shareCarol.json?.role === "viewer", shareCarol);
    const carolDoc = await call(carol, "GET", `/api/documents/${id}`);
    check("viewer can open the document", carolDoc.status === 200 && carolDoc.json?.role === "viewer", carolDoc.status);
    const carolList = await call(carol, "GET", "/api/documents");
    check(
      "it appears under the viewer's 'Shared with me'",
      carolList.json?.shared?.some((d: { id: string; role: string }) => d.id === id && d.role === "viewer"),
    );
    check("viewer can't edit (403)", (await call(carol, "PATCH", `/api/documents/${id}`, { content: "<p>x</p>", baseVersion: 3 })).status === 403);
    check("viewer can't rename (403)", (await call(carol, "PATCH", `/api/documents/${id}`, { title: "Hijacked" })).status === 403);
    check("viewer can't share (403)", (await call(carol, "POST", `/api/documents/${id}/shares`, { email: "bob@example.com", role: "editor" })).status === 403);
    check("viewer can't delete (403)", (await call(carol, "DELETE", `/api/documents/${id}`)).status === 403);

    await call(alice, "POST", `/api/documents/${id}/shares`, { email: "bob@example.com", role: "editor" });
    const bobDoc = await call(bob, "GET", `/api/documents/${id}`);
    const bobSave = await call(bob, "PATCH", `/api/documents/${id}`, { content: "<p>Bob was here</p>", baseVersion: bobDoc.json?.version });
    check("editor can edit", bobSave.status === 200, bobSave);
    check("editor can't share (403)", (await call(bob, "POST", `/api/documents/${id}/shares`, { email: "carol@example.com", role: "editor" })).status === 403);
    check("editor can't delete (403)", (await call(bob, "DELETE", `/api/documents/${id}`)).status === 403);

    check("sharing with an unknown email is a clear 404", (await call(alice, "POST", `/api/documents/${id}/shares`, { email: "nobody@example.com", role: "viewer" })).status === 404);
    check("owner can't share with themselves (400)", (await call(alice, "POST", `/api/documents/${id}/shares`, { email: "alice@example.com", role: "editor" })).status === 400);
    check("an invalid role is rejected (400)", (await call(alice, "POST", `/api/documents/${id}/shares`, { email: "bob@example.com", role: "admin" })).status === 400);

    const promote = await call(alice, "POST", `/api/documents/${id}/shares`, { email: "carol@example.com", role: "editor" });
    const carolPromoted = await call(carol, "GET", `/api/documents/${id}`);
    check("owner can change a role", promote.status === 200 && carolPromoted.json?.role === "editor");

    const shares = await call(alice, "GET", `/api/documents/${id}/shares`);
    check("owner sees everyone with access", shares.json?.shares?.length === 2, shares.json);
    const carolId = shares.json?.shares?.find((s: { email: string }) => s.email === "carol@example.com")?.userId;
    check("owner can remove access", (await call(alice, "DELETE", `/api/documents/${id}/shares/${carolId}`)).status === 204);
    check("removed person gets 404 again", (await call(carol, "GET", `/api/documents/${id}`)).status === 404);

    console.log("\nFile import");
    const imported = await call(alice, "POST", "/api/import", undefined, upload("meeting_notes.md", "# Imported\n\nSome **bold** text.\n\n- one\n- two\n"));
    check("a Markdown file becomes a new document", imported.status === 201, imported);
    if (imported.json?.id) created.push(imported.json.id);
    const importedDoc = await call(alice, "GET", `/api/documents/${imported.json?.id}`);
    check(
      "the title comes from the file name and formatting is kept",
      importedDoc.json?.title === "meeting notes" &&
        importedDoc.json?.content?.includes("<h1>Imported</h1>") &&
        importedDoc.json?.content?.includes("<strong>bold</strong>"),
      importedDoc.json,
    );
    check("unsupported file types are rejected (415)", (await call(alice, "POST", "/api/import", undefined, upload("slides.pdf", "%PDF-1.7"))).status === 415);
    check("empty files are rejected (400)", (await call(alice, "POST", "/api/import", undefined, upload("empty.txt", ""))).status === 400);
  } finally {
    console.log("\nCleanup");
    for (const docId of created) {
      check(`deleted test document ${docId.slice(0, 8)}`, (await call(alice, "DELETE", `/api/documents/${docId}`)).status === 204);
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
