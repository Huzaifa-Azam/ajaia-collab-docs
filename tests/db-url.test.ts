import { describe, expect, it } from "vitest";
import { normalizeDatabaseUrl } from "@/lib/db/url";

describe("normalizeDatabaseUrl", () => {
  it("drops libpq-only options that postgres.js would send to the server", () => {
    const neon = "postgresql://user:pw@ep-x-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
    expect(normalizeDatabaseUrl(neon)).toBe("postgresql://user:pw@ep-x-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require");
  });

  it("leaves other URLs unchanged", () => {
    expect(normalizeDatabaseUrl("postgres://localhost:5432/app")).toBe("postgres://localhost:5432/app");
    expect(normalizeDatabaseUrl("not a url")).toBe("not a url");
  });
});
