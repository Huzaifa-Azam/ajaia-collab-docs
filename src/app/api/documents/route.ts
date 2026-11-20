import { NextResponse } from "next/server";
import { handle, readJson, requireApiUser } from "@/lib/api";
import { createDocument, listDocumentsForUser } from "@/lib/documents";
import { createDocumentSchema, parseOrThrow } from "@/lib/validation";

/** Documents the caller owns, and documents shared with them. */
export function GET() {
  return handle(async () => {
    const user = await requireApiUser();
    return NextResponse.json(await listDocumentsForUser(user.id));
  });
}

export function POST(req: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    const { title } = parseOrThrow(createDocumentSchema, await readJson(req));
    const doc = await createDocument(user.id, { title });
    return NextResponse.json(doc, { status: 201 });
  });
}
