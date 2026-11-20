"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Download, FileDown, Printer } from "lucide-react";
import { htmlToMarkdown, safeFilename } from "@/lib/export";

function downloadFile(filename: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Download as Markdown, or print / save as PDF through the browser's print dialog. */
export function ExportMenu({ editor, title }: { editor: Editor | null; title: string }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function downloadMarkdown() {
    setOpen(false);
    if (!editor) return;
    downloadFile(`${safeFilename(title)}.md`, htmlToMarkdown(editor.getHTML()), "text/markdown;charset=utf-8");
  }

  function printToPdf() {
    setOpen(false);
    // Browsers suggest the page title as the PDF's file name, so use the document title alone.
    const previousTitle = document.title;
    document.title = safeFilename(title);
    window.addEventListener("afterprint", () => (document.title = previousTitle), { once: true });
    window.print();
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        title="Download"
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
      >
        <Download className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">Download</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-56 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 text-gray-800 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={downloadMarkdown}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
          >
            <FileDown className="h-4 w-4 text-gray-500" aria-hidden />
            Markdown (.md)
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={printToPdf}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
          >
            <Printer className="h-4 w-4 text-gray-500" aria-hidden />
            PDF (via print dialog)
          </button>
        </div>
      )}
    </div>
  );
}
