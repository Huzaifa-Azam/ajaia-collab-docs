import { NextResponse } from "next/server";
import { getCurrentUser } from "./auth/session";
import { AppError } from "./errors";

export function errorResponse(status: number, code: string, message: string, details?: Record<string, unknown>) {
  return NextResponse.json({ error: { code, message, ...details } }, { status });
}

/** Wraps a route handler: known errors become clean JSON, anything else is logged and returned as a 500. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof AppError) return errorResponse(err.status, err.code, err.message, err.details);
    console.error("[api] unexpected error", err);
    return errorResponse(500, "internal_error", "Something went wrong on our side. Please try again.");
  }
}

export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError(401, "unauthenticated", "Your session has ended. Sign in again.");
  return user;
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError(400, "invalid_json", "The request body must be valid JSON.");
  }
}
