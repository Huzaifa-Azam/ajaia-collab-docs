import { AppError } from "./errors";

/**
 * Access rules live in one place. Every API route and page goes through `can()`,
 * so hiding a button in the UI is never the only protection.
 */
export type ShareRole = "viewer" | "editor";
export type AccessRole = "owner" | ShareRole;
export type DocumentAction = "view" | "edit" | "share" | "delete";

const PERMISSIONS: Record<AccessRole, readonly DocumentAction[]> = {
  owner: ["view", "edit", "share", "delete"],
  editor: ["view", "edit"],
  viewer: ["view"],
};

/** The caller's role on a document: owner, the role it was shared with, or null (no access). */
export function resolveAccess(
  document: { ownerId: string },
  userId: string,
  shareRole: ShareRole | null | undefined,
): AccessRole | null {
  if (document.ownerId === userId) return "owner";
  return shareRole ?? null;
}

export function can(role: AccessRole | null, action: DocumentAction): boolean {
  return role !== null && PERMISSIONS[role].includes(action);
}

const FORBIDDEN_MESSAGES: Record<DocumentAction, string> = {
  view: "You don't have access to this document.",
  edit: "You have view-only access to this document.",
  share: "Only the owner can change who has access.",
  delete: "Only the owner can delete this document.",
};

/**
 * Turns a document lookup into the right HTTP outcome:
 * - 404 when it doesn't exist OR isn't shared with the caller (same response, so IDs can't be probed)
 * - 403 when the caller can see it but their role doesn't allow the action
 */
export function assertAccess<T extends { role: AccessRole }>(doc: T | null, action: DocumentAction): T {
  if (!doc) throw new AppError(404, "not_found", "Document not found, or it hasn't been shared with you.");
  if (!can(doc.role, action)) throw new AppError(403, "forbidden", FORBIDDEN_MESSAGES[action]);
  return doc;
}
