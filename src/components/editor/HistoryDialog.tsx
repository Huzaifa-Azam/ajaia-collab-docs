"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, RotateCcw, X } from "lucide-react";
import { ApiError, apiFetch, getErrorMessage } from "@/lib/client/api";
import { timeAgo } from "@/lib/format";

type VersionSummary = { id: string; version: number; title: string; savedAt: string; savedByName: string | null };
type VersionDetail = VersionSummary & { content: string };
export type RestoredVersion = { version: number; content: string; restoredFrom: string };

type Props = {
  documentId: string;
  open: boolean;
  onClose: () => void;
  canRestore: boolean;
  /** The open editor's state, so a restore is based on the version the user is looking at. */
  getEditorState: () => { version: number; busy: boolean };
  onRestored: (restored: RestoredVersion) => void;
};

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function HistoryDialog({ documentId, open, onClose, canRestore, getEditorState, onRestored }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [versions, setVersions] = useState<VersionSummary[] | null>(null);
  const [selected, setSelected] = useState<VersionDetail | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      setVersions(null);
      setSelected(null);
      setError(null);
      apiFetch<VersionSummary[]>(`/api/documents/${documentId}/versions`)
        .then(setVersions)
        .catch((err) => setError(getErrorMessage(err)));
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, documentId]);

  async function select(id: string) {
    setLoadingId(id);
    setError(null);
    try {
      setSelected(await apiFetch<VersionDetail>(`/api/documents/${documentId}/versions/${id}`));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingId(null);
    }
  }

  async function restore() {
    if (!selected) return;
    const state = getEditorState();
    if (state.busy) {
      setError("Your latest changes are still being saved. Try again in a moment.");
      return;
    }
    setRestoring(true);
    setError(null);
    try {
      const restored = await apiFetch<RestoredVersion>(`/api/documents/${documentId}/versions/${selected.id}/restore`, {
        method: "POST",
        body: { baseVersion: state.version },
      });
      onRestored(restored);
      dialogRef.current?.close();
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 409
          ? "The document changed after you opened it. Close this, load the latest version, then try again."
          : getErrorMessage(err),
      );
    } finally {
      setRestoring(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="history-dialog-title"
      className="m-auto h-[min(88vh,760px)] w-[min(96vw,1040px)] rounded-xl bg-white p-0 text-gray-900 shadow-2xl backdrop:bg-gray-900/40"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <h2 id="history-dialog-title" className="text-lg font-semibold">
            Version history
          </h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Close"
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          <aside className="max-h-48 shrink-0 overflow-y-auto border-b border-gray-200 sm:max-h-none sm:w-72 sm:border-r sm:border-b-0">
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-medium">Current version</p>
              <p className="text-xs text-gray-500">What everyone sees now</p>
            </div>
            {versions === null && !error && <p className="px-4 py-3 text-sm text-gray-500">Loading…</p>}
            {versions?.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-500">
                No earlier versions yet. A version is kept when someone new starts editing, after a 5-minute break,
                and every 10 minutes during long editing sessions.
              </p>
            )}
            <ul>
              {versions?.map((v) => (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => void select(v.id)}
                    aria-current={selected?.id === v.id}
                    className={`flex w-full items-start gap-2 px-4 py-3 text-left hover:bg-gray-50 ${
                      selected?.id === v.id ? "bg-blue-50 hover:bg-blue-50" : ""
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{dateTime.format(new Date(v.savedAt))}</span>
                      <span className="block truncate text-xs text-gray-500">
                        {v.savedByName ?? "Unknown"} · {timeAgo(new Date(v.savedAt))}
                      </span>
                    </span>
                    {loadingId === v.id && <LoaderCircle className="mt-0.5 h-4 w-4 animate-spin text-gray-400" aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <section className="flex min-h-0 min-w-0 flex-1 flex-col">
            {error && (
              <p role="alert" className="m-4 mb-0 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            {selected ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-3">
                  <p className="text-sm text-gray-700">
                    Saved by <span className="font-medium">{selected.savedByName ?? "Unknown"}</span> on{" "}
                    {dateTime.format(new Date(selected.savedAt))}
                  </p>
                  {canRestore && (
                    <button
                      type="button"
                      onClick={() => void restore()}
                      disabled={restoring}
                      className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {restoring ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <RotateCcw className="h-4 w-4" aria-hidden />
                      )}
                      Restore this version
                    </button>
                  )}
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto bg-[#eef0f3] p-4 sm:p-6">
                  <div className="mx-auto max-w-[700px] rounded-sm bg-white px-6 py-8 shadow-sm ring-1 ring-gray-200 sm:px-10">
                    {/* Stored content is sanitized on every write (src/lib/sanitize.ts), so it's safe to render. */}
                    <div className="doc-content" dangerouslySetInnerHTML={{ __html: selected.content }} />
                  </div>
                </div>
              </>
            ) : (
              <p className="m-auto px-6 text-center text-sm text-gray-500">
                Select a version to preview it.
                {canRestore && " You can restore any version, and restoring is itself kept in the history."}
              </p>
            )}
          </section>
        </div>
      </div>
    </dialog>
  );
}
