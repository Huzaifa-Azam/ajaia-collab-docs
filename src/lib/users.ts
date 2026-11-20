import { asc } from "drizzle-orm";
import { getDb } from "./db";
import { users } from "./db/schema";

export async function listUsers() {
  return getDb().select({ id: users.id, name: users.name, email: users.email }).from(users).orderBy(asc(users.name));
}
