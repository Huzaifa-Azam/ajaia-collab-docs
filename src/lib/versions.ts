import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { documentVersions, users } from "./db/schema";
import { requireDocumentAccess, saveDocumentContent } from "./documents";
import { AppError } from "./errors";
import { isUuid } from "./ids";
import { sanitizeDocumentHtml } from "./sanitize";

/** Anyone who can view a document can browse its history. */
export async function listVersions(documentId: string, userId: string) {
  await requireDocumentAccess(documentId, userId, "view");
  return getDb()
    .select({
      id: documentVersions.id,
      version: documentVersions.version,
      title: documentVersions.title,
      savedAt: documentVersions.savedAt,
      savedByName: users.name,
    })
    .from(documentVersions)
    .leftJoin(users, eq(users.id, documentVersions.savedBy))
    .where(eq(documentVersions.documentId, documentId))
    .orderBy(desc(documentVersions.createdAt))
    .limit(100);
}

async function findVersion(documentId: string, versionId: string) {
  if (!isUuid(versionId)) return null;
  const [row] = await getDb()
    .select({
      id: documentVersions.id,
      version: documentVersions.version,
      title: documentVersions.title,
      content: documentVersions.content,
      savedAt: documentVersions.savedAt,
      savedByName: users.name,
    })
    .from(documentVersions)
    .leftJoin(users, eq(users.id, documentVersions.savedBy))
    .where(and(eq(documentVersions.id, versionId), eq(documentVersions.documentId, documentId)))
    .limit(1);
  return row ?? null;
}

export async function getVersion(documentId: string, userId: string, versionId: string) {
  await requireDocumentAccess(documentId, userId, "view");
  const version = await findVersion(documentId, versionId);
  if (!version) throw new AppError(404, "version_not_found", "That version doesn't exist.");
  return version;
}

/**
 * Restoring is just another save (same permission and version checks), and it always keeps
 * the content it replaces, so a restore can itself be undone from the history.
 */
export async function restoreVersion(documentId: string, userId: string, versionId: string, baseVersion: number) {
  await requireDocumentAccess(documentId, userId, "edit");
  const version = await findVersion(documentId, versionId);
  if (!version) throw new AppError(404, "version_not_found", "That version doesn't exist.");
  const saved = await saveDocumentContent(documentId, userId, version.content, baseVersion, { alwaysKeepVersion: true });
  return { ...saved, content: sanitizeDocumentHtml(version.content), restoredFrom: version.savedAt };
}
