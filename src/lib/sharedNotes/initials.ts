const MAX_INITIALS = 2;

/** Derive 1–2 uppercase initials for avatars (display name, then email). */
export function initialsFromLabel(displayName?: string | null, email?: string | null): string {
  const name = displayName?.trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, MAX_INITIALS);
    }
    if (parts[0].length >= 2) return parts[0].slice(0, 2).toUpperCase();
    if (parts[0].length === 1) return parts[0].toUpperCase();
  }

  const mail = email?.trim();
  if (mail) {
    const local = mail.split("@")[0] ?? mail;
    const chunks = local.split(/[._-]+/).filter(Boolean);
    if (chunks.length >= 2) {
      return (chunks[0][0] + chunks[1][0]).toUpperCase().slice(0, MAX_INITIALS);
    }
    if (local.length >= 2) return local.slice(0, 2).toUpperCase();
    return local.slice(0, 1).toUpperCase();
  }

  return "?";
}

export const SHARED_NOTE_MAX_LENGTH = 2000;

export function normalizeSharedNoteBody(raw: string): string | null {
  const body = raw.trim();
  if (!body) return null;
  if (body.length > SHARED_NOTE_MAX_LENGTH) {
    throw new Error(`Notes must be ${SHARED_NOTE_MAX_LENGTH} characters or fewer.`);
  }
  return body;
}

export function sharedNotePreview(body: string, max = 120): string {
  const oneLine = body.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}
