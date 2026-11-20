import { NextResponse } from "next/server";
import { handle, requireApiUser } from "@/lib/api";
import { listVersions } from "@/lib/versions";

type Context = { params: Promise<{ id: string }> };

/** Earlier versions of the document, newest first (anyone with view access). */
export function GET(_req: Request, { params }: Context) {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    return NextResponse.json(await listVersions(id, user.id));
  });
}
