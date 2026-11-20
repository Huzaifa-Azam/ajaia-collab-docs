import { describe, expect, it } from "vitest";
import { describePresence, timeAgo } from "@/lib/format";

describe("describePresence", () => {
  it("says nothing when you're alone", () => {
    expect(describePresence([])).toBe("");
  });

  it("uses first names and reads naturally for one, two or more people", () => {
    expect(describePresence(["Bob Martinez"])).toBe("Bob is here too");
    expect(describePresence(["Bob Martinez", "Carol Chen"])).toBe("Bob and Carol are here too");
    expect(describePresence(["Bob Martinez", "Carol Chen", "Dan Lee"])).toBe("Bob, Carol and 1 other are here too");
    expect(describePresence(["Bob Martinez", "Carol Chen", "Dan Lee", "Eve Ng"])).toBe("Bob, Carol and 2 others are here too");
  });
});

describe("timeAgo", () => {
  const now = new Date("2026-11-20T12:00:00Z");

  it("rounds to a friendly unit", () => {
    expect(timeAgo(new Date("2026-11-20T11:59:50Z"), now)).toBe("just now");
    expect(timeAgo(new Date("2026-11-20T11:55:00Z"), now)).toBe("5 minutes ago");
    expect(timeAgo(new Date("2026-11-20T09:00:00Z"), now)).toBe("3 hours ago");
    expect(timeAgo(new Date("2026-11-19T12:00:00Z"), now)).toBe("yesterday");
  });
});
