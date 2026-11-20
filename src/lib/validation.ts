import { z } from "zod";
import { AppError } from "./errors";
import { CONTENT_MAX_LENGTH, TITLE_MAX_LENGTH } from "./limits";

export const titleSchema = z
  .string()
  .trim()
  .min(1, "Title can't be empty.")
  .max(TITLE_MAX_LENGTH, `Title must be ${TITLE_MAX_LENGTH} characters or fewer.`);

export const createDocumentSchema = z.object({
  title: titleSchema.optional(),
});

/** A PATCH can rename, save content, or both. Content saves must say which version they were based on. */
export const updateDocumentSchema = z
  .object({
    title: titleSchema.optional(),
    content: z.string().max(CONTENT_MAX_LENGTH, "This document is too large to save.").optional(),
    baseVersion: z.number().int().positive().optional(),
  })
  .refine((v) => v.title !== undefined || v.content !== undefined, { error: "Nothing to update." })
  .refine((v) => v.content === undefined || v.baseVersion !== undefined, {
    error: "baseVersion is required when saving content.",
    path: ["baseVersion"],
  });

export const shareSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  role: z.enum(["viewer", "editor"], "Access must be viewer or editor."),
});

export function parseOrThrow<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AppError(400, "validation_error", result.error.issues[0]?.message ?? "Invalid request.");
  }
  return result.data;
}
