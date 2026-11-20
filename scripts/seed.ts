/**
 * Creates the demo accounts and a few documents that show owned vs shared access.
 * Safe to run more than once: users are upserted, and documents are only added on the first run.
 *
 *   npm run db:seed          # first-time setup
 *   npm run db:reset-demo    # put the demo documents back to their original state
 */
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import { normalizeDatabaseUrl } from "../src/lib/db/url";
import { DEMO_USERS } from "../src/lib/demo-users";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: rely on variables already in the environment.
}

const RESET = process.argv.includes("--reset");

const WELCOME = `
<h1>Welcome to Ajaia Docs</h1>
<p>This is a <strong>lightweight collaborative editor</strong>. Everything you type is <em>saved automatically</em>, and formatting such as <u>underline</u> is still there when you come back.</p>
<h2>Things to try</h2>
<ul>
  <li><p>Format text with the toolbar, or with <code>Ctrl+B</code>, <code>Ctrl+I</code> and <code>Ctrl+U</code>.</p></li>
  <li><p>Use <strong>Share</strong> to give another demo account view or edit access.</p></li>
  <li><p>Import a <code>.txt</code>, <code>.md</code> or <code>.docx</code> file from the documents page.</p></li>
</ul>
<h3>Who can see this document</h3>
<ol>
  <li><p>Alice owns it.</p></li>
  <li><p>Bob can edit it.</p></li>
  <li><p>Carol can only view it.</p></li>
</ol>
<blockquote><p>Tip: open a private window and sign in as Bob or Carol to see sharing from their side.</p></blockquote>
`;

const LAUNCH_PLAN = `
<h1>Q1 launch plan</h1>
<p>Private draft. Only Alice can see this document until she shares it.</p>
<h2>Goals</h2>
<ol>
  <li><p>Ship the beta to 20 design partners.</p></li>
  <li><p>Collect feedback on <strong>sharing</strong> and <strong>import</strong>.</p></li>
</ol>
`;

const RETRO = `
<h1>Team retro notes</h1>
<p>Owned by Bob and shared with Alice as <em>view only</em>.</p>
<h2>What went well</h2>
<ul>
  <li><p>Releases went out on time.</p></li>
  <li><p>Fewer support tickets after the onboarding changes.</p></li>
</ul>
<h2>What to improve</h2>
<ul>
  <li><p>Write down decisions in a shared doc instead of chat threads.</p></li>
</ul>
`;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Add it to .env.local first.");

  const client = postgres(normalizeDatabaseUrl(url), { prepare: false, max: 1 });
  const db = drizzle(client, { schema });
  try {
    await db
      .insert(schema.users)
      .values(DEMO_USERS.map((u) => ({ name: u.name, email: u.email })))
      .onConflictDoNothing({ target: schema.users.email });

    const all = await db.select().from(schema.users);
    const byEmail = new Map(all.map((u) => [u.email, u]));
    const alice = byEmail.get("alice@example.com")!;
    const bob = byEmail.get("bob@example.com")!;
    const carol = byEmail.get("carol@example.com")!;

    if (RESET) {
      // Cascades to their shares. Only touches documents owned by the demo accounts.
      await db.delete(schema.documents).where(inArray(schema.documents.ownerId, [alice.id, bob.id, carol.id]));
      console.log("Removed all documents owned by the demo accounts.");
    } else {
      const existing = await db
        .select({ id: schema.documents.id })
        .from(schema.documents)
        .where(eq(schema.documents.ownerId, alice.id))
        .limit(1);
      if (existing.length > 0) {
        console.log("Demo users are ready. Demo documents already exist, so none were added (use --reset to recreate them).");
        return;
      }
    }

    const [welcome] = await db
      .insert(schema.documents)
      .values({ ownerId: alice.id, title: "Welcome to Ajaia Docs", content: WELCOME.trim() })
      .returning();
    await db.insert(schema.documents).values({ ownerId: alice.id, title: "Q1 launch plan", content: LAUNCH_PLAN.trim() });
    const [retro] = await db
      .insert(schema.documents)
      .values({ ownerId: bob.id, title: "Team retro notes", content: RETRO.trim() })
      .returning();

    await db.insert(schema.documentShares).values([
      { documentId: welcome.id, userId: bob.id, role: "editor" },
      { documentId: welcome.id, userId: carol.id, role: "viewer" },
      { documentId: retro.id, userId: alice.id, role: "viewer" },
    ]);

    console.log("Seeded 3 demo users and 3 documents.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
