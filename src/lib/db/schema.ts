import { index, integer, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const shareRole = pgEnum("share_role", ["viewer", "editor"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled document"),
    /** Sanitized HTML produced by the editor or the importer. */
    content: text("content").notNull().default(""),
    /** Bumped on every content save. Used to reject saves based on a stale copy. */
    version: integer("version").notNull().default(1),
    /** Who saved the content most recently. Shown to others as "Bob saved new changes". */
    lastEditedBy: uuid("last_edited_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("documents_owner_id_idx").on(t.ownerId)],
);

export const documentShares = pgTable(
  "document_shares",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: shareRole("role").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.documentId, t.userId] }),
    index("document_shares_user_id_idx").on(t.userId),
  ],
);

/**
 * Who has a document open right now. Each open editor sends a heartbeat every few seconds;
 * anyone seen in the last 30 seconds counts as present. Rows are tiny and overwritten in place.
 */
export const documentPresence = pgTable(
  "document_presence",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.documentId, t.userId] })],
);

/**
 * Earlier versions of a document's content. One snapshot per editing session, not one per
 * autosave (see versioning.ts). `savedBy`/`savedAt` describe when the content was originally
 * saved, which is what people care about ("Alice's version from 10:42").
 */
export const documentVersions = pgTable(
  "document_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    savedBy: uuid("saved_by").references(() => users.id, { onDelete: "set null" }),
    savedAt: timestamp("saved_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("document_versions_document_id_idx").on(t.documentId, t.createdAt)],
);

export type User = typeof users.$inferSelect;
export type Document = typeof documents.$inferSelect;
