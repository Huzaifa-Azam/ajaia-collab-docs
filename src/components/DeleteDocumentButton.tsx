"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { apiFetch, getErrorMessage } from "@/lib/client/api";

export function DeleteDocumentButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!window.confirm(`Delete "${title}"? This can't be undone, and anyone it's shared with loses access.`)) return;
    setBusy(true);
    try {
      await apiFetch(`/api/documents/${id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      window.alert(getErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={`Delete ${title}`}
      title="Delete"
      className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      <Trash2 className="h-4 w-4" aria-hidden />
    </button>
  );
}
