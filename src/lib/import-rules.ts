// Shared by the browser (early feedback) and the server (the real check). No server-only imports here.

export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;
export const IMPORT_EXTENSIONS = [".txt", ".md", ".markdown", ".docx"] as const;
export const IMPORT_ACCEPT = IMPORT_EXTENSIONS.join(",");
export const IMPORT_HELP_TEXT = ".txt, .md or .docx, up to 2 MB. Images aren't imported.";

export function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

export function isSupportedExtension(ext: string): boolean {
  return (IMPORT_EXTENSIONS as readonly string[]).includes(ext);
}
