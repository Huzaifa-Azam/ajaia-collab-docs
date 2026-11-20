import { describe, expect, it } from "vitest";
import { CHECKPOINT_MS, SESSION_GAP_MS, isEffectivelyEmpty, shouldKeepVersion } from "@/lib/versioning";

const now = new Date("2026-11-20T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);
const doc = (overrides: Partial<Parameters<typeof shouldKeepVersion>[0]> = {}) => ({
  content: "<p>Some work</p>",
  lastEditedBy: "alice",
  updatedAt: ago(30_000),
  createdAt: ago(60_000),
  ...overrides,
});

describe("shouldKeepVersion", () => {
  it("keeps the previous content when someone else starts editing", () => {
    expect(shouldKeepVersion(doc(), "bob", null, now)).toBe(true);
  });

  it("doesn't keep a version on every autosave of the same session", () => {
    expect(shouldKeepVersion(doc(), "alice", ago(60_000), now)).toBe(false);
  });

  it("keeps a version on the first save after a break", () => {
    expect(shouldKeepVersion(doc({ updatedAt: ago(SESSION_GAP_MS + 1) }), "alice", ago(60_000), now)).toBe(true);
  });

  it("keeps periodic checkpoints during a long session", () => {
    expect(shouldKeepVersion(doc(), "alice", ago(CHECKPOINT_MS + 1), now)).toBe(true);
    expect(shouldKeepVersion(doc({ createdAt: ago(CHECKPOINT_MS + 1) }), "alice", null, now)).toBe(true);
  });

  it("never keeps an empty document", () => {
    expect(shouldKeepVersion(doc({ content: "<p></p>" }), "bob", null, now)).toBe(false);
  });
});

describe("isEffectivelyEmpty", () => {
  it("ignores tags and whitespace", () => {
    expect(isEffectivelyEmpty("")).toBe(true);
    expect(isEffectivelyEmpty("<p> &nbsp; </p><p></p>")).toBe(true);
    expect(isEffectivelyEmpty("<p>x</p>")).toBe(false);
  });
});
