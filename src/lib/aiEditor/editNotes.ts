/**
 * Edit notes — shoot / client / look direction that feeds Edit by Chat.
 * Freeform text only; never includes media bytes.
 */

import type { EditNote, EditNoteSource } from "@/lib/aiEditor/types";

export const EDIT_NOTE_SOURCES: Array<{
  id: EditNoteSource;
  label: string;
  blurb: string;
}> = [
  {
    id: "shooting",
    label: "On set",
    blurb: "Things you noticed while shooting",
  },
  {
    id: "client",
    label: "Client",
    blurb: "What the client asked for",
  },
  {
    id: "look",
    label: "Look / feel",
    blurb: "Pace, mood, style of the edit",
  },
  {
    id: "general",
    label: "General",
    blurb: "Anything else for the cut",
  },
];

export const MAX_EDIT_NOTES = 40;
export const MAX_EDIT_NOTE_CHARS = 2000;

function newNoteId(): string {
  return `en_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createEditNote(input: {
  text: string;
  source?: EditNoteSource;
}): EditNote | null {
  const text = input.text.trim().slice(0, MAX_EDIT_NOTE_CHARS);
  if (!text) return null;
  const source = input.source && EDIT_NOTE_SOURCES.some((s) => s.id === input.source)
    ? input.source
    : "general";
  return {
    id: newNoteId(),
    text,
    source,
    createdAt: new Date().toISOString(),
  };
}

export function normalizeEditNotes(notes: EditNote[] | undefined | null): EditNote[] {
  if (!Array.isArray(notes)) return [];
  return notes
    .filter((n) => n && typeof n.text === "string" && n.text.trim())
    .map((n) => ({
      id: String(n.id || newNoteId()),
      text: String(n.text).trim().slice(0, MAX_EDIT_NOTE_CHARS),
      source: (EDIT_NOTE_SOURCES.some((s) => s.id === n.source)
        ? n.source
        : "general") as EditNoteSource,
      createdAt: n.createdAt || new Date().toISOString(),
    }))
    .slice(0, MAX_EDIT_NOTES);
}

export function sourceLabel(source: EditNoteSource): string {
  return EDIT_NOTE_SOURCES.find((s) => s.id === source)?.label || "General";
}

/** Compact block for Gemini / chat context. */
export function formatEditNotesForChat(notes: EditNote[] | undefined | null): string {
  const list = normalizeEditNotes(notes);
  if (!list.length) return "";
  return list
    .map((n, i) => `${i + 1}. [${sourceLabel(n.source)}] ${n.text}`)
    .join("\n");
}

export function wantsNotesDrivenEdit(message: string): boolean {
  const t = message.toLowerCase().replace(/\s+/g, " ").trim();
  return (
    /\b(edit notes?|my notes|client notes?|shoot(?:ing)? notes?|use (the |my )?notes|follow (the |my )?notes|from (the |my )?notes)\b/.test(
      t
    ) ||
    /^(apply|use|follow)\s+(notes|edit notes)\b/.test(t)
  );
}

/** Default chat message when the user clicks “Propose from notes”. */
export const PROPOSE_FROM_NOTES_MESSAGE =
  "Using my saved edit notes as the brief, propose concrete timeline edits that best match them. Prefer clear cuts over vague suggestions.";
