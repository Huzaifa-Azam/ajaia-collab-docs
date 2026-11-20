import { NextResponse } from "next/server";
import { handle, readJson, requireApiUser } from "@/lib/api";
import { listShares, shareDocument } from "@/lib/documents";
import { parseOrThrow, shareSchema } from "@/lib/validation";

type Context = { params: Promise<{ id: string }> };

/** Who has access (owner only). */
export function GET(_req: Request, { params }: Context) {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    return NextResponse.json(await listShares(id, user.id));
  });
}

/** Grant access by email, or change an existing person's role (owner only). */
export function POST(req: Request, { params }: Context) {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const { email, role } = parseOrThrow(shareSchema, await readJson(req));
    return NextResponse.json(await shareDocument(id, user.id, email, role));
  });
}
