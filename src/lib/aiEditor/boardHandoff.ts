/**
 * V9 — one-way handoff of next-shoot checklist into production board filming notes.
 * Replaces a marked AI Editor section if present; never wipes the rest of the notes.
 */

import type { NextShootChecklist } from "@/lib/aiEditor/types";

export const AI_EDITOR_NOTES_START = "— From AI Editor (next shoot)";
export const AI_EDITOR_NOTES_END = "— End AI Editor";

export function formatNextShootHandoffBlock(
  checklist: NextShootChecklist,
  options?: { includeDone?: boolean }
): string {
  const includeDone = options?.includeDone === true;
  const rows = checklist.items.filter((i) => includeDone || !i.done);
  const lines = [
    AI_EDITOR_NOTES_START,
    checklist.sourceTimelineName
      ? `Source cut: ${checklist.sourceTimelineName}`
      : null,
    `Updated: ${checklist.updatedAt.slice(0, 10)}`,
    "",
  ].filter((l) => l !== null) as string[];

  if (!rows.length) {
    lines.push("(No open next-shoot items.)");
  } else {
    for (const item of rows) {
      lines.push(`${item.done ? "[x]" : "[ ]"} ${item.label}`);
    }
  }
  lines.push("", AI_EDITOR_NOTES_END);
  return lines.join("\n");
}

/**
 * Merge/replace the AI Editor section inside filming notes.
 * If the markers exist, replace that span; otherwise append.
 */
export function mergeFilmingNotesWithHandoff(
  existingNotes: string | undefined | null,
  handoffBlock: string
): string {
  const existing = (existingNotes || "").trim();
  const block = handoffBlock.trim();
  if (!existing) return block;

  const start = existing.indexOf(AI_EDITOR_NOTES_START);
  if (start === -1) {
    return `${existing}\n\n${block}`;
  }

  const end = existing.indexOf(AI_EDITOR_NOTES_END, start);
  if (end === -1) {
    // Malformed prior section — append fresh block
    return `${existing}\n\n${block}`;
  }

  const before = existing.slice(0, start).trimEnd();
  const after = existing.slice(end + AI_EDITOR_NOTES_END.length).trimStart();
  return [before, block, after].filter(Boolean).join("\n\n");
}

export function countOpenChecklistItems(checklist?: NextShootChecklist | null): number {
  return (checklist?.items || []).filter((i) => !i.done).length;
}
