"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { FileUp, LoaderCircle } from "lucide-react";
import { apiFetch, getErrorMessage } from "@/lib/client/api";
import { getExtension, IMPORT_ACCEPT, IMPORT_HELP_TEXT, IMPORT_MAX_BYTES, isSupportedExtension } from "@/lib/import-rules";

/** Turns a .txt, .md or .docx file into a new editable document. */
export function ImportButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFileChosen(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again after an error
    if (!file) return;

    // Quick feedback in the browser. The server repeats every check.
    if (!isSupportedExtension(getExtension(file.name))) {
      setError("Only .txt, .md and .docx files can be imported.");
      return;
    }
    if (file.size > IMPORT_MAX_BYTES) {
      setError("That file is larger than 2 MB.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { id } = await apiFetch<{ id: string }>("/api/import", { method: "POST", formData });
      router.push(`/documents/${id}`);
    } catch (err) {
      setError(getErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end">
      <input
        ref={inputRef}
        type="file"
        accept={IMPORT_ACCEPT}
        onChange={onFileChosen}
        className="hidden"
        aria-hidden
        tabIndex={-1}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-60"
      >
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : <FileUp className="h-4 w-4" aria-hidden />}
        {busy ? "Importing…" : "Import file"}
      </button>
      <p className="mt-1 max-w-48 text-right text-xs text-gray-500">{IMPORT_HELP_TEXT}</p>
      {error && (
        <p role="alert" className="mt-1 max-w-64 text-right text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
