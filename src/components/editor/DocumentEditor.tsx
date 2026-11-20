"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { ArrowLeft, Check, Eye, LoaderCircle, Share2, TriangleAlert } from "lucide-react";
import { ApiError, apiFetch, getErrorMessage } from "@/lib/client/api";
import { TITLE_MAX_LENGTH } from "@/lib/limits";
import type { AccessRole } from "@/lib/permissions";
import { ShareDialog } from "@/components/ShareDialog";
import { Toolbar } from "./Toolbar";

type SaveState = "saved" | "unsaved" | "saving" | "retrying" | "failed" | "conflict";

const AUTOSAVE_DELAY_MS = 800;
const RETRY_DELAY_MS = 4000;

type Props = {
  doc: { id: string; title: string; content: string; version: number };
  role: AccessRole;
  owner: { name: string; email: string };
};

export function DocumentEditor({ doc, role, owner }: Props) {
  const canEdit = role === "owner" || role === "editor";

  const [title, setTitle] = useState(doc.title);
  const [titleError, setTitleError] = useState<string | null>(null);
  const savedTitleRef = useRef(doc.title);
  const cancelTitleEditRef = useRef(false);

  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  // Autosave bookkeeping lives in refs so editor callbacks never see stale values.
  const versionRef = useRef(doc.version); // version our copy is based on
  const dirtyRef = useRef(false); // edits not yet sent
  const inFlightRef = useRef(false); // a save request is running
  const blockedRef = useRef(false); // stop saving (conflict, or no permission)
  const latestHtmlRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef<() => Promise<void>>(async () => {});

  const scheduleSave = useCallback((delay: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void saveRef.current(), delay);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: { openOnClick: !canEdit, autolink: true },
      }),
      Placeholder.configure({ placeholder: canEdit ? "Start writing…" : "This document is empty." }),
    ],
    content: doc.content,
    editable: canEdit,
    immediatelyRender: false, // avoid SSR hydration mismatches
    editorProps: { attributes: { class: "doc-content", "aria-label": "Document content" } },
    onUpdate: ({ editor: current }) => {
      latestHtmlRef.current = current.getHTML();
      dirtyRef.current = true;
      if (blockedRef.current) return;
      setSaveState("unsaved");
      scheduleSave(AUTOSAVE_DELAY_MS);
    },
  });

  useEffect(() => {
    saveRef.current = async () => {
      if (!editor || !dirtyRef.current || inFlightRef.current || blockedRef.current) return;
      inFlightRef.current = true;
      dirtyRef.current = false;
      setSaveState("saving");
      let retry = false;
      try {
        const saved = await apiFetch<{ version: number }>(`/api/documents/${doc.id}`, {
          method: "PATCH",
          body: { content: editor.getHTML(), baseVersion: versionRef.current },
        });
        versionRef.current = saved.version;
        setSaveError(null);
      } catch (err) {
        dirtyRef.current = true;
        if (err instanceof ApiError && err.status === 409) {
          blockedRef.current = true;
          setSaveState("conflict");
        } else if (err instanceof ApiError && err.status >= 400 && err.status < 500) {
          // Lost access, session ended or invalid content: retrying won't help.
          blockedRef.current = true;
          setSaveError(err.message);
          setSaveState("failed");
        } else {
          retry = true; // network or server error: keep the edits and try again
          setSaveError(getErrorMessage(err));
          setSaveState("retrying");
        }
      } finally {
        inFlightRef.current = false;
      }
      if (blockedRef.current) return;
      if (retry) scheduleSave(RETRY_DELAY_MS);
      else if (dirtyRef.current) scheduleSave(AUTOSAVE_DELAY_MS); // typed while saving
      else setSaveState("saved");
    };
  }, [editor, doc.id, scheduleSave]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault(); // save now instead of the browser's "save page" dialog
        if (timerRef.current) clearTimeout(timerRef.current);
        void saveRef.current();
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current || inFlightRef.current) e.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (timerRef.current) clearTimeout(timerRef.current);
      // Leaving the page inside the app: send the last edits rather than dropping them.
      if (dirtyRef.current && !blockedRef.current && !inFlightRef.current && latestHtmlRef.current !== null) {
        void fetch(`/api/documents/${doc.id}`, {
          method: "PATCH",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: latestHtmlRef.current, baseVersion: versionRef.current }),
        }).catch(() => {});
      }
    };
  }, [doc.id]);

  useEffect(() => {
    document.title = `${title.trim() || "Untitled document"} · Ajaia Docs`;
  }, [title]);

  async function commitTitle() {
    const next = title.trim();
    if (next === savedTitleRef.current) {
      setTitle(next);
      return;
    }
    if (!next) {
      setTitle(savedTitleRef.current);
      setTitleError("A title can't be empty, so the previous one was kept.");
      return;
    }
    setTitleError(null);
    try {
      await apiFetch(`/api/documents/${doc.id}`, { method: "PATCH", body: { title: next } });
      savedTitleRef.current = next;
      setTitle(next);
    } catch (err) {
      setTitle(savedTitleRef.current);
      setTitleError(`Couldn't rename: ${getErrorMessage(err)}`);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#eef0f3]">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2 px-2 py-2 sm:px-4">
          <Link
            href="/documents"
            className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
            aria-label="Back to documents"
            title="Back to documents"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden />
          </Link>
          <div className="min-w-0 flex-1">
            {canEdit ? (
              <input
                aria-label="Document title"
                value={title}
                maxLength={TITLE_MAX_LENGTH}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setTitleError(null);
                }}
                onBlur={() => {
                  if (cancelTitleEditRef.current) {
                    cancelTitleEditRef.current = false;
                    return;
                  }
                  void commitTitle();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.currentTarget.blur();
                  } else if (e.key === "Escape") {
                    cancelTitleEditRef.current = true;
                    setTitle(savedTitleRef.current);
                    e.currentTarget.blur();
                  }
                }}
                className="w-full truncate rounded-md border border-transparent px-1.5 py-0.5 text-lg font-medium text-gray-900 outline-none hover:border-gray-300 focus:border-blue-500"
              />
            ) : (
              <h1 className="truncate px-1.5 py-0.5 text-lg font-medium text-gray-900">{title}</h1>
            )}
            <div className="flex flex-wrap items-center gap-x-3 px-1.5 text-xs text-gray-500" aria-live="polite">
              {canEdit ? (
                <SaveIndicator state={saveState} error={saveError} />
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" aria-hidden /> View only
                </span>
              )}
              {titleError && <span className="text-red-600">{titleError}</span>}
            </div>
          </div>
          {role === "owner" ? (
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              <Share2 className="h-4 w-4" aria-hidden />
              Share
            </button>
          ) : (
            <span className="hidden rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-700 sm:inline">
              Shared by {owner.name} · {role === "editor" ? "Can edit" : "Can view"}
            </span>
          )}
        </div>
        {canEdit && editor && <Toolbar editor={editor} />}
      </header>

      {saveState === "conflict" && (
        <div role="alert" className="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p className="flex-1">
            This document was changed somewhere else (by another person, or by you in another tab) after you opened
            it, so your latest edits weren&apos;t saved. Copy anything you want to keep, then reload to get the newest
            version.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md bg-amber-600 px-3 py-1 text-sm font-medium text-white hover:bg-amber-700"
          >
            Reload
          </button>
        </div>
      )}
      {!canEdit && (
        <div className="flex items-center gap-2 border-b border-blue-100 bg-blue-50 px-4 py-2 text-sm text-blue-900">
          <Eye className="h-4 w-4 shrink-0" aria-hidden />
          {owner.name} shared this document with you as a viewer, so you can read it but not change it.
        </div>
      )}

      <main className="flex-1 px-2 py-6 sm:px-6 sm:py-8">
        <div
          className="mx-auto min-h-[75vh] max-w-[816px] cursor-text rounded-sm bg-white px-6 py-10 shadow-sm ring-1 ring-gray-200 sm:px-16 sm:py-14"
          onClick={(e) => {
            // Clicking the page margin focuses the end of the document, like a word processor.
            if (e.target === e.currentTarget) editor?.chain().focus("end").run();
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </main>

      {role === "owner" && (
        <ShareDialog documentId={doc.id} documentTitle={title} open={shareOpen} onClose={() => setShareOpen(false)} />
      )}
    </div>
  );
}

function SaveIndicator({ state, error }: { state: SaveState; error: string | null }) {
  switch (state) {
    case "saving":
      return (
        <span className="inline-flex items-center gap-1">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin" aria-hidden /> Saving…
        </span>
      );
    case "unsaved":
      return <span>Unsaved changes</span>;
    case "retrying":
      return <span className="text-amber-700">Couldn&apos;t save ({error}). Retrying…</span>;
    case "failed":
      return <span className="text-red-600">Not saved: {error}</span>;
    case "conflict":
      return <span className="text-red-600">Not saved: a newer version exists</span>;
    default:
      return (
        <span className="inline-flex items-center gap-1">
          <Check className="h-3.5 w-3.5" aria-hidden /> All changes saved
        </span>
      );
  }
}
