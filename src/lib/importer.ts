import mammoth from "mammoth";
import { marked } from "marked";
import { AppError } from "./errors";
import { getExtension, IMPORT_MAX_BYTES, isSupportedExtension } from "./import-rules";
import { TITLE_MAX_LENGTH } from "./limits";
import { sanitizeDocumentHtml } from "./sanitize";

const ZIP_SIGNATURE = [0x50, 0x4b, 0x03, 0x04]; // .docx files are zip archives

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Plain text to paragraphs: blank lines split paragraphs, single newlines become line breaks. */
export function textToHtml(text: string): string {
  const normalized = text.replace(/\r\n?/g, "\n").trim();
  if (!normalized) return "";
  return normalized
    .split(/\n\s*\n/)
    .map((block) => `<p>${block.split("\n").map(escapeHtml).join("<br>")}</p>`)
    .join("");
}

export function markdownToHtml(markdown: string): string {
  return marked.parse(markdown, { async: false, gfm: true }) as string;
}

export function titleFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]*$/, "").replace(/_+/g, " ").trim();
  return (base || "Imported document").slice(0, TITLE_MAX_LENGTH);
}

export function hasVisibleText(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length > 0;
}

function decodeUtf8(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new AppError(400, "invalid_encoding", "This file isn't UTF-8 text. Re-save it as UTF-8 and try again.");
  }
}

/** Converts an uploaded file into sanitized editor HTML. Throws AppError with a message fit for the UI. */
export async function convertFileToHtml(filename: string, bytes: Uint8Array): Promise<string> {
  const ext = getExtension(filename);
  if (!isSupportedExtension(ext)) {
    const what = ext ? `"${ext}" files aren't` : "Files without an extension aren't";
    throw new AppError(415, "unsupported_type", `${what} supported. Upload a .txt, .md or .docx file.`);
  }
  if (bytes.byteLength === 0) throw new AppError(400, "empty_file", "This file is empty.");
  if (bytes.byteLength > IMPORT_MAX_BYTES) throw new AppError(413, "file_too_large", "This file is larger than 2 MB.");

  let html: string;
  if (ext === ".docx") {
    if (!ZIP_SIGNATURE.every((byte, i) => bytes[i] === byte)) {
      throw new AppError(400, "invalid_docx", "This doesn't look like a valid .docx file.");
    }
    try {
      // Mammoth ignores underline by default; map it so it survives the import.
      const result = await mammoth.convertToHtml({ buffer: Buffer.from(bytes) }, { styleMap: ["u => u"] });
      html = result.value;
    } catch {
      throw new AppError(400, "unreadable_docx", "We couldn't read this .docx file. It may be damaged or password-protected.");
    }
  } else {
    const text = decodeUtf8(bytes);
    html = ext === ".txt" ? textToHtml(text) : markdownToHtml(text);
  }

  const clean = sanitizeDocumentHtml(html, { describeDroppedImages: true });
  if (!hasVisibleText(clean)) throw new AppError(400, "no_text", "We couldn't find any text in this file.");
  return clean;
}
