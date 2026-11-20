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
