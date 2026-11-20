import type { ReactNode } from "react";
import { AppHeader } from "@/components/AppHeader";
import { DocumentRow } from "@/components/DocumentRow";
import { ImportButton } from "@/components/ImportButton";
import { NewDocumentButton } from "@/components/NewDocumentButton";
import { requireUser } from "@/lib/auth/session";
import { listDocumentsForUser } from "@/lib/documents";

export const metadata = { title: "Documents · Ajaia Docs" };

export default async function DocumentsPage() {
  const user = await requireUser();
  const { owned, shared } = await listDocumentsForUser(user.id);

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Documents</h1>
            <p className="mt-1 text-sm text-gray-600">Create a document, import a file, or open one shared with you.</p>
          </div>
          <div className="flex items-start gap-2">
            <ImportButton />
            <NewDocumentButton />
          </div>
        </div>

        <Section title="My documents" count={owned.length} empty="No documents yet. Create one or import a file to get started.">
          {owned.map((doc) => (
            <DocumentRow key={doc.id} kind="owned" {...doc} />
          ))}
        </Section>

        <Section title="Shared with me" count={shared.length} empty="Nothing has been shared with you yet.">
          {shared.map((doc) => (
            <DocumentRow key={doc.id} kind="shared" {...doc} />
          ))}
        </Section>
      </main>
    </>
  );
}

function Section({ title, count, empty, children }: { title: string; count: number; empty: string; children: ReactNode }) {
  const headingId = `${title.toLowerCase().replace(/\s+/g, "-")}-heading`;
  return (
    <section className="mt-8" aria-labelledby={headingId}>
      <h2 id={headingId} className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700">
        {title}
        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700">{count}</span>
      </h2>
      {count === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-gray-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200 bg-white">{children}</ul>
      )}
    </section>
  );
}
