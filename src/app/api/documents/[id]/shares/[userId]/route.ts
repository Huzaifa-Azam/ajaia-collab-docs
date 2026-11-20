import { NextResponse } from "next/server";
import { handle, requireApiUser } from "@/lib/api";
import { removeShare } from "@/lib/documents";

type Context = { params: Promise<{ id: string; userId: string }> };

/** Remove someone's access (owner only). */
export function DELETE(_req: Request, { params }: Context) {
  return handle(async () => {
    const user = await requireApiUser();
    const { id, userId } = await params;
    await removeShare(id, user.id, userId);
    return new NextResponse(null, { status: 204 });
  });
}
