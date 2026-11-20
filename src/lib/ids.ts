const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Checked before querying so malformed IDs become a clean 404 instead of a database error. */
export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
