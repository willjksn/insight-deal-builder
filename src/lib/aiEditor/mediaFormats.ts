/**
 * Shared media extension registry for Managed Ingest / indexing.
 * Keep Desktop Agent MEDIA_EXTS aligned when adding formats.
 */

export type MediaFormatKind = "video" | "audio" | "image";

const VIDEO_EXTS = [
  ".mp4",
  ".mov",
  ".mxf",
  ".mkv",
  ".avi",
  ".mts",
  ".m2ts",
  ".r3d",
  ".braw",
] as const;

const AUDIO_EXTS = [".wav", ".bwf", ".aiff", ".aif", ".mp3", ".m4a", ".aac"] as const;

const IMAGE_EXTS = [".jpg", ".jpeg", ".png", ".tif", ".tiff"] as const;

export const MEDIA_FORMAT_REGISTRY: Record<MediaFormatKind, readonly string[]> = {
  video: VIDEO_EXTS,
  audio: AUDIO_EXTS,
  image: IMAGE_EXTS,
};

const ALL = new Set<string>([...VIDEO_EXTS, ...AUDIO_EXTS, ...IMAGE_EXTS]);

export function normalizeExtension(extOrFilename: string): string {
  const raw = extOrFilename.includes(".")
    ? extOrFilename.slice(extOrFilename.lastIndexOf("."))
    : extOrFilename;
  const ext = raw.toLowerCase().startsWith(".") ? raw.toLowerCase() : `.${raw.toLowerCase()}`;
  return ext;
}

export function isAllowedMediaExtension(extOrFilename: string): boolean {
  return ALL.has(normalizeExtension(extOrFilename));
}

export function kindForExtension(extOrFilename: string): MediaFormatKind | null {
  const ext = normalizeExtension(extOrFilename);
  if ((VIDEO_EXTS as readonly string[]).includes(ext)) return "video";
  if ((AUDIO_EXTS as readonly string[]).includes(ext)) return "audio";
  if ((IMAGE_EXTS as readonly string[]).includes(ext)) return "image";
  return null;
}

/** Flat list for agent / walk filters. */
export function allMediaExtensions(): string[] {
  return [...ALL];
}
