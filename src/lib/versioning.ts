/**
 * When to keep a version. Autosave writes every second or so while someone types, so keeping
 * every save would bury the history in noise. Instead we keep the content that is about to be
 * replaced when a new "editing session" starts, plus periodic checkpoints in long sessions.
 */

/** Saves this far apart count as separate sessions. */
export const SESSION_GAP_MS = 5 * 60 * 1000;
/** During one long session, keep a checkpoint at least this often. */
export const CHECKPOINT_MS = 10 * 60 * 1000;

type CurrentState = {
  content: string;
  lastEditedBy: string | null;
  updatedAt: Date;
  createdAt: Date;
};

export function isEffectivelyEmpty(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length === 0;
}

/**
 * Should the content about to be overwritten by `editorId` be kept as a version?
 * - never for an empty document
 * - yes when someone else saved it last (their work is about to change)
 * - yes on the first save after a break
 * - otherwise, yes if the last checkpoint (or the document's creation) is old enough
 */
export function shouldKeepVersion(
  current: CurrentState,
  editorId: string,
  lastSnapshotAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (isEffectivelyEmpty(current.content)) return false;
  if (current.lastEditedBy !== editorId) return true;
  if (now.getTime() - current.updatedAt.getTime() >= SESSION_GAP_MS) return true;
  const since = lastSnapshotAt ?? current.createdAt;
  return now.getTime() - since.getTime() >= CHECKPOINT_MS;
}
