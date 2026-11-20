import sanitizeHtml from "sanitize-html";

/** Exactly the tags the editor can represent. Other tags are dropped but their text is kept. */
const ALLOWED_TAGS = [
  "p", "br", "h1", "h2", "h3", "strong", "em", "u", "s", "code", "pre",
  "blockquote", "ul", "ol", "li", "hr", "a",
];

/**
 * Runs on every write (editor saves and file imports), so stored HTML can never carry
 * scripts, event handlers or javascript: links, whatever the client sends.
 */
export function sanitizeDocumentHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: { a: ["href", "target", "rel"], ol: ["start"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    transformTags: {
      b: "strong",
      i: "em",
      strike: "s",
      del: "s",
      ins: "u",
      h4: "h3",
      h5: "h3",
      h6: "h3",
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow", target: "_blank" }),
    },
  }).trim();
}
