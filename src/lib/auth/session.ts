import { eq } from "drizzle-orm";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { users, type User } from "@/lib/db/schema";
import { isUuid } from "@/lib/ids";

/*
 * Simulated sign-in: the user picks a seeded account and we issue a signed, HTTP-only
 * session cookie. Authorization is real: every request resolves the user from this
 * cookie on the server, never from anything the client claims.
 */

export const SESSION_COOKIE = "ajaia_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};

function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SESSION_SECRET must be set to a random string of at least 16 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());
}

async function readSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { algorithms: ["HS256"] });
    return typeof payload.sub === "string" && isUuid(payload.sub) ? payload.sub : null;
  } catch {
    return null; // expired, tampered with, or signed with another secret
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const userId = await readSessionUserId();
  if (!userId) return null;
  const [user] = await getDb().select().from(users).where(eq(users.id, userId)).limit(1);
  return user ?? null;
}

/** For pages: send signed-out visitors to the account picker. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
