/**
 * Human-readable managed ingest paths.
 * Physical folders are for humans; DB IDs remain the identity.
 */

const WIN_RESERVED = new Set([
  "CON",
  "PRN",
  "AUX",
  "NUL",
  "COM1",
  "COM2",
  "COM3",
  "COM4",
  "COM5",
  "COM6",
  "COM7",
  "COM8",
  "COM9",
  "LPT1",
  "LPT2",
  "LPT3",
  "LPT4",
  "LPT5",
  "LPT6",
  "LPT7",
  "LPT8",
  "LPT9",
]);

/** Default managed media root under a storage location drive/root. */
export const DEFAULT_MANAGED_MEDIA_SEGMENT = "Media/ShootSpine";

export function sanitizePathSegment(raw: string, maxLen = 48): string {
  let s = String(raw || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^\.+|\.+$/g, "")
    .replace(/^_+|_+$/g, "");
  if (!s) s = "Untitled";
  if (WIN_RESERVED.has(s.toUpperCase())) s = `${s}_media`;
  if (s.length > maxLen) s = s.slice(0, maxLen).replace(/_+$/g, "");
  return s || "Untitled";
}

export function formatShootDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Join managed media root under a storage root (drive letter path, volume, or UNC).
 * Uses forward slashes in the relative segment; caller may normalize for display.
 */
export function buildManagedMediaRoot(storageRootPath: string): string {
  const root = storageRootPath.replace(/[/\\]+$/, "");
  const sep = root.includes("\\") || /^[A-Za-z]:$/.test(root) ? "\\" : "/";
  const segment = DEFAULT_MANAGED_MEDIA_SEGMENT.replace(/\//g, sep);
  if (/^[A-Za-z]:$/i.test(root)) {
    return `${root}${sep}${segment}`;
  }
  return `${root}${sep}${segment}`;
}

export type IngestFolderNameInput = {
  shootDate?: string | Date;
  clientOrProject: string;
  shootLabel: string;
  cameraLabel: string;
  /** Optional Card01 / A001 */
  cardOrReel?: string | null;
};

/** YYYY-MM-DD_ClientOrProject_ShootLabel_Camera[_Card] */
export function buildIngestFolderName(input: IngestFolderNameInput): string {
  const date =
    typeof input.shootDate === "string"
      ? input.shootDate
      : formatShootDate(input.shootDate || new Date());
  const parts = [
    date,
    sanitizePathSegment(input.clientOrProject, 40),
    sanitizePathSegment(input.shootLabel, 40),
    sanitizePathSegment(input.cameraLabel, 24),
  ];
  if (input.cardOrReel?.trim()) {
    parts.push(sanitizePathSegment(input.cardOrReel, 16));
  }
  return parts.join("_");
}

export function buildIngestDestinationPath(
  storageRootPath: string,
  folderName: string
): string {
  const mediaRoot = buildManagedMediaRoot(storageRootPath);
  const sep = mediaRoot.includes("\\") ? "\\" : "/";
  return `${mediaRoot}${sep}${sanitizePathSegment(folderName, 120)}`;
}

/** If base exists, return Card02 / Card03 style unique name. */
export function resolveUniqueFolderName(
  baseName: string,
  existingNames: string[]
): string {
  const set = new Set(existingNames.map((n) => n.toLowerCase()));
  if (!set.has(baseName.toLowerCase())) return baseName;
  for (let i = 2; i <= 99; i++) {
    const suffix = `Card${String(i).padStart(2, "0")}`;
    const candidate = `${baseName}_${suffix}`;
    if (!set.has(candidate.toLowerCase())) return candidate;
  }
  return `${baseName}_${Date.now()}`;
}
