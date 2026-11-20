import { describe, expect, it } from "vitest";
import { htmlToMarkdown, safeFilename } from "@/lib/export";

describe("Markdown export", () => {
  it("converts the editor's formatting", () => {
    const html =
      "<h1>Plan</h1><p><strong>bold</strong>, <em>italic</em>, <s>gone</s> and <u>underlined</u></p>" +
      "<ul><li><p>one</p></li><li><p>two</p></li></ul><ol><li><p>first</p></li><li><p>second</p></li></ol>" +
      "<blockquote><p>quoted</p></blockquote>";
    expect(htmlToMarkdown(html)).toBe(
      [
        "# Plan",
        "",
        "**bold**, _italic_, ~~gone~~ and <u>underlined</u>",
        "",
        "- one",
        "- two",
        "",
        "1. first",
        "2. second",
        "",
        "> quoted",
        "",
      ].join("\n"),
    );
  });

  it("round-trips through the importer's Markdown support", async () => {
    const { markdownToHtml } = await import("@/lib/importer");
    const markdown = htmlToMarkdown("<h2>Notes</h2><p>Some <strong>bold</strong> text</p><ul><li><p>a</p></li></ul>");
    const html = markdownToHtml(markdown);
    expect(html).toContain("<h2>Notes</h2>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toMatch(/<li>a<\/li>/);
  });
});

describe("safeFilename", () => {
  it("removes characters that aren't allowed in file names", () => {
    expect(safeFilename('Q3: plan / draft "v2"?')).toBe("Q3- plan - draft -v2-");
  });

  it("falls back for empty titles", () => {
    expect(safeFilename("   ")).toBe("Untitled document");
  });
});
