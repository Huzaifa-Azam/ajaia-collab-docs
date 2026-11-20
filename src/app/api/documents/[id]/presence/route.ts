import { NextResponse } from "next/server";
import { handle, requireApiUser } from "@/lib/api";
import { clearPresence, recordHeartbeat } from "@/lib/presence";

type Context = { params: Promise<{ id: string }> };

/**
 * Heartbeat from an open editor.
 *   {}                  → records the caller as present; returns who else is here and the latest version
 *   { leaving: true }   → removes the caller immediately (sent when the editor closes)
 */
export function POST(req: Request, { params }: Context) {
  return handle(async () => {
    const user = await requireApiUser();
    const { id } = await params;
    const body = (await req.json().catch(() => ({}))) as { leaving?: unknown } | null;
    if (body?.leaving === true) {
      await clearPresence(id, user.id);
      return new NextResponse(null, { status: 204 });
    }
    return NextResponse.json(await recordHeartbeat(id, user.id));
  });
}
