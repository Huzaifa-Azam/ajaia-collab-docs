import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { IMPORT_MAX_BYTES } from "@/lib/import-rules";
import { convertFileToHtml, textToHtml, titleFromFilename } from "@/lib/importer";

const utf8 = (text: string) => new TextEncoder().encode(text);

async function importError(filename: string, bytes: Uint8Array): Promise<AppError> {
  try {
    await convertFileToHtml(filename, bytes);
  } catch (err) {
    if (err instanceof AppError) return err;
    throw err;
  }
  throw new Error(`expected importing ${filename} to fail`);
}

/** Builds a minimal real .docx in memory, so the test exercises the actual mammoth conversion. */
async function makeDocx(bodyXml: string): Promise<Uint8Array> {
  const w = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.file(
    "word/styles.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<w:styles xmlns:w="${w}">
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/></w:style>
</w:styles>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="${w}"><w:body>${bodyXml}</w:body></w:document>`,
  );
  return zip.generateAsync({ type: "uint8array" });
}

describe("plain text import", () => {
  it("turns blank-line-separated blocks into paragraphs and keeps line breaks", () => {
    expect(textToHtml("Line one\nLine two\n\nSecond paragraph")).toBe("<p>Line one<br>Line two</p><p>Second paragraph</p>");
  });

  it("escapes HTML instead of interpreting it", async () => {
    const html = await convertFileToHtml("notes.txt", utf8("Hello <script>alert(1)</script> & <b>friends</b>"));
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp;");
  });

  it("handles Windows line endings", async () => {
    const html = await convertFileToHtml("notes.txt", utf8("First\r\n\r\nSecond"));
    expect(html).toBe("<p>First</p><p>Second</p>");
  });
});

describe("markdown import", () => {
  it("keeps headings, emphasis and lists", async () => {
    const md = "# Plan\n\nSome **bold** and _italic_ text.\n\n- one\n- two\n\n1. first\n2. second\n";
    const html = await convertFileToHtml("plan.md", utf8(md));
    expect(html).toContain("<h1>Plan</h1>");
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toMatch(/<ul>\s*<li>one<\/li>/);
    expect(html).toMatch(/<ol>\s*<li>first<\/li>/);
  });

  it("maps headings the editor doesn't support (h4-h6) to h3", async () => {
    const html = await convertFileToHtml("deep.md", utf8("#### Deep heading"));
    expect(html).toBe("<h3>Deep heading</h3>");
  });

  it("strips scripts, event handlers and javascript: links from raw HTML", async () => {
    const md = [
      "<script>alert('xss')</script>",
      "",
      '<p onclick="steal()">Hello</p>',
      "",
      "[click me](javascript:alert(1))",
      "",
      '<img src="x" onerror="alert(1)">',
    ].join("\n");
    const html = await convertFileToHtml("evil.md", utf8(md));
    expect(html).not.toMatch(/<script|onclick|onerror|javascript:|<img/i);
    expect(html).toContain("Hello");
    expect(html).toContain("click me");
  });
});

describe("docx import", () => {
  it("converts headings, bold and underline from a real .docx", async () => {
    const docx = await makeDocx(`
      <w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Quarterly report</w:t></w:r></w:p>
      <w:p>
        <w:r><w:rPr><w:b/></w:rPr><w:t>Bold</w:t></w:r>
        <w:r><w:t xml:space="preserve"> and </w:t></w:r>
        <w:r><w:rPr><w:u w:val="single"/></w:rPr><w:t>underlined</w:t></w:r>
      </w:p>`);
    const html = await convertFileToHtml("report.docx", docx);
    expect(html).toBe("<h1>Quarterly report</h1><p><strong>Bold</strong> and <u>underlined</u></p>");
  });

  it("rejects a file that only pretends to be a .docx", async () => {
    const err = await importError("fake.docx", utf8("definitely not a zip file"));
    expect(err).toMatchObject({ status: 400, code: "invalid_docx" });
  });

  it("rejects a damaged .docx with a readable message", async () => {
    const damaged = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5, 6, 7, 8]);
    const err = await importError("damaged.docx", damaged);
    expect(err).toMatchObject({ status: 400, code: "unreadable_docx" });
  });
});

describe("upload validation", () => {
  it("rejects unsupported file types with 415", async () => {
    expect(await importError("slides.pdf", utf8("%PDF-1.7"))).toMatchObject({ status: 415, code: "unsupported_type" });
    expect(await importError("README", utf8("no extension"))).toMatchObject({ status: 415 });
  });

  it("rejects empty files", async () => {
    expect(await importError("empty.txt", new Uint8Array())).toMatchObject({ status: 400, code: "empty_file" });
  });

  it("rejects files over the size limit with 413", async () => {
    const big = new Uint8Array(IMPORT_MAX_BYTES + 1).fill(97);
    expect(await importError("big.txt", big)).toMatchObject({ status: 413, code: "file_too_large" });
  });

  it("rejects text files that aren't UTF-8", async () => {
    const latin1 = new Uint8Array([0x63, 0x61, 0x66, 0xe9]); // "café" in Latin-1
    expect(await importError("legacy.txt", latin1)).toMatchObject({ status: 400, code: "invalid_encoding" });
  });

  it("rejects files with no readable text", async () => {
    expect(await importError("blank.md", utf8("   \n\n  "))).toMatchObject({ code: "no_text" });
  });
});

describe("titleFromFilename", () => {
  it("drops the extension and turns underscores into spaces", () => {
    expect(titleFromFilename("q3_launch_plan.docx")).toBe("q3 launch plan");
  });

  it("falls back to a default title", () => {
    expect(titleFromFilename(".md")).toBe("Imported document");
  });

  it("caps very long names at 200 characters", () => {
    expect(titleFromFilename(`${"a".repeat(300)}.txt`)).toHaveLength(200);
  });
});
