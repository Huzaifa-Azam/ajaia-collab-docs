import { NextResponse } from "next/server";
import { handle, readJson, requireApiUser } from "@/lib/api";
import { parseOrThrow, restoreVersionSchema } from "@/lib/validation";
import { restoreVersion } from "@/lib/versions";

type Context = { params: Promise<{ id: string; versionId: string }> };

/** Make an earlier version current again (owners and editors). Body: { baseVersion }. */
export function POST(req: Request, { params }: Context) {
  return handle(async () => {
    const user = await requireApiUser();
    const { id, versionId } = await params;
    const { baseVersion } = parseOrThrow(restoreVersionSchema, await readJson(req));
    return NextResponse.json(await restoreVersion(id, user.id, versionId, baseVersion));
  });
}
