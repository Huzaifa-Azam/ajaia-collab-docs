import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { sanitizeDocumentHtml } from "@/lib/sanitize";
import { parseOrThrow, shareSchema, updateDocumentSchema } from "@/lib/validation";

function validationMessage(schema: Parameters<typeof parseOrThrow>[0], input: unknown): string {
  try {
    parseOrThrow(schema, input);
  } catch (err) {
    if (err instanceof AppError) {
      expect(err.status).toBe(400);
      return err.message;
    }
    throw err;
  }
  throw new Error("expected validation to fail");
}

describe("share requests", () => {
  it("normalizes the email so sharing isn't case-sensitive", () => {
    expect(parseOrThrow(shareSchema, { email: "  Bob@Example.COM ", role: "editor" })).toEqual({
      email: "bob@example.com",
      role: "editor",
    });
  });

  it("rejects invalid emails and unknown roles", () => {
    expect(validationMessage(shareSchema, { email: "bob", role: "viewer" })).toBe("Enter a valid email address.");
    expect(validationMessage(shareSchema, { email: "bob@example.com", role: "admin" })).toBe(
      "Access must be viewer or editor.",
    );
  });
});

describe("document updates", () => {
  it("requires the base version when saving content", () => {
    expect(validationMessage(updateDocumentSchema, { content: "<p>Hi</p>" })).toBe(
      "baseVersion is required when saving content.",
    );
    expect(parseOrThrow(updateDocumentSchema, { content: "<p>Hi</p>", baseVersion: 3 })).toMatchObject({ baseVersion: 3 });
  });

  it("trims titles and rejects empty or overly long ones", () => {
    expect(parseOrThrow(updateDocumentSchema, { title: "  Roadmap  " }).title).toBe("Roadmap");
    expect(validationMessage(updateDocumentSchema, { title: "   " })).toBe("Title can't be empty.");
    expect(validationMessage(updateDocumentSchema, { title: "x".repeat(201) })).toMatch(/200 characters/);
  });

  it("rejects an update with nothing in it", () => {
    expect(validationMessage(updateDocumentSchema, {})).toBe("Nothing to update.");
  });
});

describe("sanitizing editor saves", () => {
  it("keeps the formatting the editor produces", () => {
    const html =
      "<h2>Title</h2><p><strong>b</strong> <em>i</em> <u>u</u> <s>s</s></p><ul><li><p>item</p></li></ul><ol><li><p>one</p></li></ol><blockquote><p>q</p></blockquote>";
    expect(sanitizeDocumentHtml(html)).toBe(html);
  });

  it("removes anything that could run code, whatever the client sends", () => {
    const dirty =
      '<p style="color:red" onmouseover="x()">Hi</p><iframe src="https://evil.example"></iframe><img src=x onerror=alert(1)><a href="javascript:alert(1)">link</a>';
    const clean = sanitizeDocumentHtml(dirty);
    expect(clean).not.toMatch(/style=|onmouseover|<iframe|<img|javascript:/);
    expect(clean).toContain("<p>Hi</p>");
  });

  it("forces safe attributes on links", () => {
    expect(sanitizeDocumentHtml('<a href="https://ajaia.ai">Ajaia</a>')).toBe(
      '<a href="https://ajaia.ai" rel="noopener noreferrer nofollow" target="_blank">Ajaia</a>',
    );
  });
});
