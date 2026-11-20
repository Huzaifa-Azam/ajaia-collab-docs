import { NextResponse } from "next/server";
import { handle, readJson, requireApiUser } from "@/lib/api";
import { deleteDocument, renameDocument, requireDocumentAccess, saveDocumentContent } from "@/lib/documents";
import { parseOrThrow, updateDocumentSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

export function GET(_req: Request, { params }: Context) {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    return NextResponse.json(await requireDocumentAccess(id, user.id, "view"));
  });
}

/** Rename ({ title }) and/or save content ({ content, baseVersion }). */
export function PATCH(req: Request, { params }: Context) {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const input = parseOrThrow(updateDocumentSchema, await readJson(req));
    let result: Record<string, unknown> = {};
    if (input.title !== undefined) {
      result = { ...result, ...(await renameDocument(id, user.id, input.title)) };
    }
    if (input.content !== undefined && input.baseVersion !== undefined) {
      result = { ...result, ...(await saveDocumentContent(id, user.id, input.content, input.baseVersion)) };
    }
    return NextResponse.json(result);
  });
}

export function DELETE(_req: Request, { params }: Context) {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    await deleteDocument(id, user.id);
    return new NextResponse(null, { status: 204 });
  });
}
