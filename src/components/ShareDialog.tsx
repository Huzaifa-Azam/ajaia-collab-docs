"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { LoaderCircle, X } from "lucide-react";
import { apiFetch, getErrorMessage } from "@/lib/client/api";
import { DEMO_USERS } from "@/lib/demo-users";
import { Avatar } from "./Avatar";

type ShareRole = "viewer" | "editor";
type Person = { userId: string; name: string; email: string; role: ShareRole };
type SharesResponse = { owner: { id: string; name: string; email: string }; shares: Person[] };

type Props = { documentId: string; documentTitle: string; open: boolean; onClose: () => void };

export function ShareDialog({ documentId, documentTitle, open, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<SharesResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<ShareRole>("editor");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoadError(null);
    try {
      setData(await apiFetch<SharesResponse>(`/api/documents/${documentId}/shares`));
    } catch (err) {
      setLoadError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      setNotice(null);
      setFormError(null);
      void load();
    } else if (!open && dialog.open) {
      dialog.close();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function share(targetEmail: string, targetRole: ShareRole) {
    const person = await apiFetch<Person>(`/api/documents/${documentId}/shares`, {
      method: "POST",
      body: { email: targetEmail, role: targetRole },
    });
    await load();
    return person;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    setNotice(null);
    try {
      const person = await share(email, role);
      setEmail("");
      setNotice(`${person.name} can now ${person.role === "editor" ? "edit" : "view"} this document.`);
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function onRoleChange(person: Person, next: ShareRole) {
    setFormError(null);
    setNotice(null);
    try {
      await share(person.email, next);
      setNotice(`${person.name} ${next === "editor" ? "can now edit" : "can now only view"} this document.`);
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  }

  async function onRemove(person: Person) {
    setFormError(null);
    setNotice(null);
    try {
      await apiFetch(`/api/documents/${documentId}/shares/${person.userId}`, { method: "DELETE" });
      await load();
      setNotice(`${person.name} no longer has access.`);
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  }

  const suggestions = DEMO_USERS.filter(
    (u) => u.email !== data?.owner.email && !data?.shares.some((s) => s.email === u.email),
  );

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="share-dialog-title"
      className="m-auto w-[min(92vw,32rem)] rounded-xl bg-white p-0 text-gray-900 shadow-2xl backdrop:bg-gray-900/40"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="share-dialog-title" className="text-lg font-semibold leading-snug">
            Share &ldquo;{documentTitle}&rdquo;
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

        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="share-email" className="sr-only">
            Email address
          </label>
          <input
            id="share-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Add people by email"
            list="share-suggestions"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <datalist id="share-suggestions">
            {suggestions.map((u) => (
              <option key={u.email} value={u.email}>
                {u.name}
              </option>
            ))}
          </datalist>
          <select
            aria-label="Access level"
            value={role}
            onChange={(e) => setRole(e.target.value as ShareRole)}
            className="rounded-md border border-gray-300 px-2 py-2 text-sm"
          >
            <option value="editor">Can edit</option>
            <option value="viewer">Can view</option>
          </select>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {busy && <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />}
            Share
          </button>
        </form>
        {suggestions.length > 0 && (
          <p className="mt-2 text-xs text-gray-500">Demo accounts: {suggestions.map((u) => u.email).join(", ")}</p>
        )}

        {formError && (
          <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {formError}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
            {notice}
          </p>
        )}

        <h3 className="mt-6 text-sm font-medium text-gray-700">People with access</h3>
        {loadError ? (
          <p className="mt-2 text-sm text-red-700">{loadError}</p>
        ) : !data ? (
          <p className="mt-2 text-sm text-gray-500">Loading…</p>
        ) : (
          <ul className="mt-1 divide-y divide-gray-100">
            <PersonRow name={data.owner.name} email={data.owner.email}>
              <span className="px-2 text-sm text-gray-500">Owner</span>
            </PersonRow>
            {data.shares.map((person) => (
              <PersonRow key={person.userId} name={person.name} email={person.email}>
                <select
                  aria-label={`Access for ${person.name}`}
                  value={person.role}
                  onChange={(e) => void onRoleChange(person, e.target.value as ShareRole)}
                  className="rounded-md border border-gray-200 px-2 py-1 text-sm"
                >
                  <option value="editor">Can edit</option>
                  <option value="viewer">Can view</option>
                </select>
                <button
                  type="button"
                  onClick={() => void onRemove(person)}
                  className="rounded-md px-2 py-1 text-sm text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
              </PersonRow>
            ))}
            {data.shares.length === 0 && (
              <li className="py-3 text-sm text-gray-500">Only you can open this document right now.</li>
            )}
          </ul>
        )}

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
          >
            Done
          </button>
        </div>
      </div>
    </dialog>
  );
}

function PersonRow({ name, email, children }: { name: string; email: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <Avatar name={name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-gray-500">{email}</p>
      </div>
      <div className="flex items-center gap-1">{children}</div>
    </li>
  );
}
