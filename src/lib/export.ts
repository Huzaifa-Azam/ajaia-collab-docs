import TurndownService from "turndown";

/**
 * Converts the editor's HTML to Markdown for download. Runs in the browser (and in tests).
 * Markdown has no underline, so <u> is kept as inline HTML, which most Markdown renderers display.
 */
export function htmlToMarkdown(html: string): string {
  const turndown = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "_",
    hr: "---",
  });

  turndown.addRule("strikethrough", {
    filter: ["s", "del"],
    replacement: (content) => `~~${content}~~`,
  });

  // Turndown's default list item puts three spaces after "-". Use the common single-space style.
  turndown.addRule("listItem", {
    filter: "li",
    replacement: (content, node, options) => {
      const parent = node.parentNode as HTMLElement | null;
      let prefix = `${options.bulletListMarker} `;
      if (parent?.nodeName === "OL") {
        const start = Number(parent.getAttribute("start") ?? 1);
        prefix = `${start + Array.prototype.indexOf.call(parent.children, node)}. `;
      }
      // Tiptap wraps list item text in <p>, which turndown pads with blank lines: trim those,
      // then indent any remaining lines (nested lists) under the marker.
      const body = content
        .replace(/^\n+/, "")
        .replace(/\n+$/, "")
        .replace(/\n/gm, `\n${" ".repeat(prefix.length)}`);
      return prefix + body + (node.nextSibling ? "\n" : "");
    },
  });

  turndown.keep(["u"]);
  return `${turndown.turndown(html).trim()}\n`;
}

/** A file name that is safe on Windows, macOS and Linux. */
export function safeFilename(title: string): string {
  const cleaned = title.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, "-").replace(/\s+/g, " ").trim();
  return (cleaned || "Untitled document").slice(0, 100);
}
