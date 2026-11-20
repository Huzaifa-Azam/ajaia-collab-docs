import { and, asc, eq, gt, ne, sql } from "drizzle-orm";
import { getDb } from "./db";
import { documentPresence, users } from "./db/schema";
import { requireDocumentAccess } from "./documents";
import { isUuid } from "./ids";

/**
 * Lightweight presence: every open editor sends a heartbeat every few seconds, and anyone seen
 * within this window counts as "here". Polling keeps it serverless-friendly (no sockets), and
 * the same response tells the editor whether someone saved a newer version.
 */
export const PRESENCE_WINDOW_SECONDS = 30;

export type PresenceSnapshot = {
  viewers: { userId: string; name: string }[];
  version: number;
  title: string;
  lastEditedBy: string | null;
};

export async function recordHeartbeat(documentId: string, userId: string): Promise<PresenceSnapshot> {
  const doc = await requireDocumentAccess(documentId, userId, "view");
  const db = getDb();

  await db
    .insert(documentPresence)
    .values({ documentId, userId, lastSeenAt: sql`now()` })
    .onConflictDoUpdate({
      target: [documentPresence.documentId, documentPresence.userId],
      set: { lastSeenAt: sql`now()` },
    });

  const [viewers, lastEditor] = await Promise.all([
    db
      .select({ userId: users.id, name: users.name })
      .from(documentPresence)
      .innerJoin(users, eq(users.id, documentPresence.userId))
      .where(
        and(
          eq(documentPresence.documentId, documentId),
          ne(documentPresence.userId, userId),
          gt(documentPresence.lastSeenAt, sql`now() - ${sql.raw(`interval '${PRESENCE_WINDOW_SECONDS} seconds'`)}`),
        ),
      )
      .orderBy(asc(users.name)),
    doc.lastEditedBy
      ? db.select({ name: users.name }).from(users).where(eq(users.id, doc.lastEditedBy)).limit(1)
      : Promise.resolve([] as { name: string }[]),
  ]);

  return { viewers, version: doc.version, title: doc.title, lastEditedBy: lastEditor[0]?.name ?? null };
}

/** Called when an editor closes, so others stop seeing you straight away instead of after the window. */
export async function clearPresence(documentId: string, userId: string) {
  if (!isUuid(documentId)) return;
  await getDb()
    .delete(documentPresence)
    .where(and(eq(documentPresence.documentId, documentId), eq(documentPresence.userId, userId)));
}
