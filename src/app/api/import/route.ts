import { NextResponse } from "next/server";
import { handle, requireApiUser } from "@/lib/api";
import { createDocument } from "@/lib/documents";
import { AppError } from "@/lib/errors";
import { IMPORT_MAX_BYTES } from "@/lib/import-rules";
import { convertFileToHtml, titleFromFilename } from "@/lib/importer";

/** Upload a .txt, .md or .docx file. It becomes a new document owned by the caller. */
export function POST(req: Request) {
  return handle(async () => {
    const user = await requireApiUser();
    const form = await req.formData().catch(() => {
      throw new AppError(400, "invalid_upload", 'Send the file as multipart/form-data in a field named "file".');
    });
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError(400, "missing_file", "Choose a file to import.");
    if (file.size > IMPORT_MAX_BYTES) throw new AppError(413, "file_too_large", "This file is larger than 2 MB.");

    const html = await convertFileToHtml(file.name, new Uint8Array(await file.arrayBuffer()));
    const doc = await createDocument(user.id, { title: titleFromFilename(file.name), content: html });
    return NextResponse.json(doc, { status: 201 });
  });
}
