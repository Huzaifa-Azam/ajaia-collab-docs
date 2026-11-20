import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { documents, documentShares, users } from "./db/schema";
import { AppError } from "./errors";
import { isUuid } from "./ids";
import { assertAccess, resolveAccess, type AccessRole, type DocumentAction, type ShareRole } from "./permissions";
import { sanitizeDocumentHtml } from "./sanitize";

export type DocumentWithAccess = {
  id: string;
  title: string;
  content: string;
  version: number;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  role: AccessRole;
  owner: { id: string; name: string; email: string };
};

/** A document plus the caller's role, or null when it doesn't exist OR the caller has no access. */
export async function getDocumentWithAccess(documentId: string, userId: string): Promise<DocumentWithAccess | null> {
  if (!isUuid(documentId)) return null;
  const [row] = await getDb()
    .select({ doc: documents, shareRole: documentShares.role, ownerName: users.name, ownerEmail: users.email })
    .from(documents)
    .innerJoin(users, eq(users.id, documents.ownerId))
    .leftJoin(documentShares, and(eq(documentShares.documentId, documents.id), eq(documentShares.userId, userId)))
    .where(eq(documents.id, documentId))
    .limit(1);
  if (!row) return null;
  const role = resolveAccess(row.doc, userId, row.shareRole);
  if (!role) return null;
  return { ...row.doc, role, owner: { id: row.doc.ownerId, name: row.ownerName, email: row.ownerEmail } };
}

/** Every document operation starts here: load with the caller's role, then check the action. */
export async function requireDocumentAccess(documentId: string, userId: string, action: DocumentAction) {
  return assertAccess(await getDocumentWithAccess(documentId, userId), action);
}

export async function listDocumentsForUser(userId: string) {
  const db = getDb();
  const [owned, shared] = await Promise.all([
    db
      .select({
        id: documents.id,
        title: documents.title,
        updatedAt: documents.updatedAt,
        shareCount: sql<number>`(select count(*)::int from ${documentShares} where ${documentShares.documentId} = ${documents.id})`,
      })
      .from(documents)
      .where(eq(documents.ownerId, userId))
      .orderBy(desc(documents.updatedAt)),
    db
      .select({
        id: documents.id,
        title: documents.title,
        updatedAt: documents.updatedAt,
        role: documentShares.role,
        ownerName: users.name,
      })
      .from(documentShares)
      .innerJoin(documents, eq(documents.id, documentShares.documentId))
      .innerJoin(users, eq(users.id, documents.ownerId))
      .where(eq(documentShares.userId, userId))
      .orderBy(desc(documents.updatedAt)),
  ]);
  return { owned, shared };
}

export async function createDocument(ownerId: string, input: { title?: string; content?: string }) {
  const [doc] = await getDb()
    .insert(documents)
    .values({
      ownerId,
      title: input.title ?? "Untitled document",
      content: input.content ? sanitizeDocumentHtml(input.content) : "",
    })
    .returning({ id: documents.id });
  return doc;
}

/** Renames don't bump the version, so renaming never conflicts with someone typing in the body. */
export async function renameDocument(documentId: string, userId: string, title: string) {
  await requireDocumentAccess(documentId, userId, "edit");
  const [doc] = await getDb()
    .update(documents)
    .set({ title, updatedAt: new Date() })
    .where(eq(documents.id, documentId))
    .returning({ title: documents.title, updatedAt: documents.updatedAt });
  return doc;
}

/**
 * Optimistic concurrency: the update only applies if the stored version still matches the
 * version the client started from. Otherwise someone else saved in between, so we return
 * 409 rather than silently overwriting their work.
 */
export async function saveDocumentContent(documentId: string, userId: string, content: string, baseVersion: number) {
  await requireDocumentAccess(documentId, userId, "edit");
  const db = getDb();
  const [saved] = await db
    .update(documents)
    .set({ content: sanitizeDocumentHtml(content), version: sql`${documents.version} + 1`, updatedAt: new Date() })
    .where(and(eq(documents.id, documentId), eq(documents.version, baseVersion)))
    .returning({ version: documents.version, updatedAt: documents.updatedAt });
  if (!saved) {
    const [current] = await db.select({ version: documents.version }).from(documents).where(eq(documents.id, documentId));
    throw new AppError(409, "conflict", "Someone else saved this document after you opened it.", {
      currentVersion: current?.version,
    });
  }
  return saved;
}

export async function deleteDocument(documentId: string, userId: string) {
  await requireDocumentAccess(documentId, userId, "delete");
  await getDb().delete(documents).where(eq(documents.id, documentId));
}

export async function listShares(documentId: string, userId: string) {
  const doc = await requireDocumentAccess(documentId, userId, "share");
  const shares = await getDb()
    .select({ userId: users.id, name: users.name, email: users.email, role: documentShares.role })
    .from(documentShares)
    .innerJoin(users, eq(users.id, documentShares.userId))
    .where(eq(documentShares.documentId, documentId))
    .orderBy(asc(users.name));
  return { owner: doc.owner, shares };
}

/** Grants access, or changes the role if the person already has access. */
export async function shareDocument(documentId: string, userId: string, email: string, role: ShareRole) {
  const doc = await requireDocumentAccess(documentId, userId, "share");
  const db = getDb();
  const [target] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!target) {
    throw new AppError(404, "user_not_found", `There's no account for ${email}. Try one of the demo accounts.`);
  }
  if (target.id === doc.ownerId) throw new AppError(400, "already_owner", "That person already owns this document.");
  await db
    .insert(documentShares)
    .values({ documentId, userId: target.id, role })
    .onConflictDoUpdate({ target: [documentShares.documentId, documentShares.userId], set: { role } });
  return { userId: target.id, name: target.name, email: target.email, role };
}

export async function removeShare(documentId: string, userId: string, targetUserId: string) {
  await requireDocumentAccess(documentId, userId, "share");
  if (!isUuid(targetUserId)) throw new AppError(404, "not_found", "That person doesn't have access.");
  await getDb()
    .delete(documentShares)
    .where(and(eq(documentShares.documentId, documentId), eq(documentShares.userId, targetUserId)));
}
