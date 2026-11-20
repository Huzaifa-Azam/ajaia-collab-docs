import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocumentEditor } from "@/components/editor/DocumentEditor";
import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { getDocumentWithAccess } from "@/lib/documents";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
  const doc = user ? await getDocumentWithAccess(id, user.id) : null;
  return { title: doc ? `${doc.title} · Ajaia Docs` : "Document not found · Ajaia Docs" };
}

export default async function DocumentPage({ params }: Props) {
  const [{ id }, user] = await Promise.all([params, requireUser()]);
  const doc = await getDocumentWithAccess(id, user.id);
  if (!doc) notFound(); // also covers "exists but not shared with you"

  return (
    <DocumentEditor
      key={doc.id}
      doc={{ id: doc.id, title: doc.title, content: doc.content, version: doc.version }}
      role={doc.role}
      owner={{ name: doc.owner.name, email: doc.owner.email }}
    />
  );
}
