/**
 * Neon connection strings include libpq-only options such as `channel_binding=require`.
 * postgres.js forwards any query parameter it doesn't recognise to the server as a
 * runtime setting (see parseOptions in postgres/src/index.js), which Postgres rejects.
 * Strip the libpq-only ones so the same DATABASE_URL works for psql and for this app.
 */
const LIBPQ_ONLY_PARAMS = ["channel_binding"];

export function normalizeDatabaseUrl(raw: string): string {
  try {
    const url = new URL(raw);
    for (const param of LIBPQ_ONLY_PARAMS) url.searchParams.delete(param);
    return url.toString();
  } catch {
    return raw; // not a URL (e.g. a key/value DSN): pass it through unchanged
  }
}
