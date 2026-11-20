import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

// Reuse one client across hot reloads in dev and across invocations of a warm serverless function.
const globalForDb = globalThis as unknown as { __ajaiaDb?: Db };

/** Lazily connects so builds and tests that never touch the database don't need DATABASE_URL. */
export function getDb(): Db {
  if (globalForDb.__ajaiaDb) return globalForDb.__ajaiaDb;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local and add a Postgres connection string.");
  }
  // prepare: false keeps us compatible with pooled (PgBouncer) connection strings such as Neon's.
  const client = postgres(url, { prepare: false, max: 5 });
  globalForDb.__ajaiaDb = drizzle(client, { schema });
  return globalForDb.__ajaiaDb;
}
