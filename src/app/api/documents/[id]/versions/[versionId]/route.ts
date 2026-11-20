import { NextResponse } from "next/server";
import { handle, requireApiUser } from "@/lib/api";
import { getVersion } from "@/lib/versions";

type Context = { params: Promise<{ id: string; versionId: string }> };

/** One earlier version, including its content, for previewing (anyone with view access). */
export function GET(_req: Request, { params }: Context) {
  return handle(async () => {
    const user = await requireApiUser();
    const { id, versionId } = await params;
    return NextResponse.json(await getVersion(id, user.id, versionId));
  });
}
