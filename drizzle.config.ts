import { defineConfig } from "drizzle-kit";
import { normalizeDatabaseUrl } from "./src/lib/db/url";

try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: rely on variables already in the environment.
}

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: normalizeDatabaseUrl(process.env.DATABASE_URL ?? "") },
  strict: true,
  verbose: true,
});
