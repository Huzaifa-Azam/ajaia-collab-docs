import sanitizeHtml from "sanitize-html";

/** Exactly the tags the editor can represent. Other tags are dropped but their text is kept. */
const ALLOWED_TAGS = [
  "p", "br", "h1", "h2", "h3", "strong", "em", "u", "s", "code", "pre",
  "blockquote", "ul", "ol", "li", "hr", "a",
];

type SanitizeOptions = {
  /**
   * For imports: images aren't supported, so instead of dropping them silently, leave a visible
   * "[Image not imported: description]" note where each one was.
   */
  describeDroppedImages?: boolean;
};

const describeImage: sanitizeHtml.Transformer = (_tagName, attribs) => {
  const description = attribs.alt?.trim();
  return { tagName: "em", attribs: {}, text: `[Image not imported${description ? `: ${description}` : ""}]` };
};

/**
 * Runs on every write (editor saves and file imports), so stored HTML can never carry
 * scripts, event handlers or javascript: links, whatever the client sends.
 */
export function sanitizeDocumentHtml(html: string, options: SanitizeOptions = {}): string {
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
      ...(options.describeDroppedImages ? { img: describeImage } : {}),
    },
  }).trim();
}
