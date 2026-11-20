import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { assertAccess, can, resolveAccess, type AccessRole, type DocumentAction } from "@/lib/permissions";

const doc = { ownerId: "alice" };

describe("resolveAccess", () => {
  it("treats the owner as owner, even if a share row exists for them", () => {
    expect(resolveAccess(doc, "alice", "viewer")).toBe("owner");
  });

  it("uses the shared role for everyone else", () => {
    expect(resolveAccess(doc, "bob", "editor")).toBe("editor");
    expect(resolveAccess(doc, "carol", "viewer")).toBe("viewer");
  });

  it("gives no access when the document isn't shared with the user", () => {
    expect(resolveAccess(doc, "mallory", null)).toBeNull();
    expect(resolveAccess(doc, "mallory", undefined)).toBeNull();
  });
});

describe("can", () => {
  const expected: Record<AccessRole, Record<DocumentAction, boolean>> = {
    owner: { view: true, edit: true, share: true, delete: true },
    editor: { view: true, edit: true, share: false, delete: false },
    viewer: { view: true, edit: false, share: false, delete: false },
  };

  for (const [role, actions] of Object.entries(expected) as [AccessRole, Record<DocumentAction, boolean>][]) {
    for (const [action, allowed] of Object.entries(actions) as [DocumentAction, boolean][]) {
      it(`${role} ${allowed ? "can" : "cannot"} ${action}`, () => {
        expect(can(role, action)).toBe(allowed);
      });
    }
  }

  it("denies every action without access", () => {
    for (const action of ["view", "edit", "share", "delete"] as const) {
      expect(can(null, action)).toBe(false);
    }
  });
});

describe("assertAccess", () => {
  function errorFrom(fn: () => unknown): AppError {
    try {
      fn();
    } catch (err) {
      if (err instanceof AppError) return err;
      throw err;
    }
    throw new Error("expected an AppError");
  }

  it("returns 404, not 403, when the document isn't shared with the caller", () => {
    const err = errorFrom(() => assertAccess(null, "view"));
    expect(err.status).toBe(404);
  });

  it("returns 403 with a clear message when the role is too low", () => {
    const viewerEdit = errorFrom(() => assertAccess({ role: "viewer" }, "edit"));
    expect(viewerEdit.status).toBe(403);
    expect(viewerEdit.message).toMatch(/view-only/);

    const editorShare = errorFrom(() => assertAccess({ role: "editor" }, "share"));
    expect(editorShare.status).toBe(403);
    expect(editorShare.message).toMatch(/only the owner/i);
  });

  it("passes the document through when the action is allowed", () => {
    const owned = { role: "owner" as const, id: "doc-1" };
    expect(assertAccess(owned, "delete")).toBe(owned);
    expect(assertAccess({ role: "editor" as const }, "edit").role).toBe("editor");
  });
});
