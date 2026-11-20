import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

/** Demo sign-in: the account picker posts a seeded account's email, and we set a signed session cookie. */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const email = String(form?.get("email") ?? "").trim().toLowerCase();
  const [user] = email ? await getDb().select().from(users).where(eq(users.email, email)).limit(1) : [];
  if (!user) return NextResponse.redirect(new URL("/login?error=unknown_account", req.url), 303);

  const res = NextResponse.redirect(new URL("/documents", req.url), 303);
  res.cookies.set(SESSION_COOKIE, await createSessionToken(user.id), sessionCookieOptions);
  return res;
}
