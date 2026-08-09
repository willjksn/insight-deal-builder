/**
 * Shared media extension registry for Managed Ingest / indexing.
 * Keep Desktop Agent MEDIA_EXTS aligned when adding formats.
 *
 * Ingest copies video + audio only. Camera proxy/still JPGs (e.g. Sony *T01.JPG)
 * are recognized for detection but never indexed or copied.
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

const INGESTABLE = new Set<string>([...VIDEO_EXTS, ...AUDIO_EXTS]);
const ALL = new Set<string>([...INGESTABLE, ...IMAGE_EXTS]);

export function normalizeExtension(extOrFilename: string): string {
  const raw = extOrFilename.includes(".")
    ? extOrFilename.slice(extOrFilename.lastIndexOf("."))
    : extOrFilename;
  const ext = raw.toLowerCase().startsWith(".") ? raw.toLowerCase() : `.${raw.toLowerCase()}`;
  return ext;
}

/** Video or audio — what we copy / catalog into a project. */
export function isIngestableMediaExtension(extOrFilename: string): boolean {
  return INGESTABLE.has(normalizeExtension(extOrFilename));
}

/** @deprecated Prefer isIngestableMediaExtension for copy/index. */
export function isAllowedMediaExtension(extOrFilename: string): boolean {
  return isIngestableMediaExtension(extOrFilename);
}

export function kindForExtension(extOrFilename: string): MediaFormatKind | null {
  const ext = normalizeExtension(extOrFilename);
  if ((VIDEO_EXTS as readonly string[]).includes(ext)) return "video";
  if ((AUDIO_EXTS as readonly string[]).includes(ext)) return "audio";
  if ((IMAGE_EXTS as readonly string[]).includes(ext)) return "image";
  return null;
}

/** Flat list for agent walk / index (video + audio only). */
export function allMediaExtensions(): string[] {
  return [...INGESTABLE];
}

export function allKnownMediaExtensions(): string[] {
  return [...ALL];
}

/**
 * True for clips that belong on a ShootSpine rough cut.
 * Excludes camera proxy stills (*T01.JPG) even if ffprobe labeled them as MJPEG "video".
 */
export function isRoughCutVideoAsset(asset: {
  filename?: string | null;
  mediaType?: string | null;
}): boolean {
  const name = asset.filename || "";
  if (!name || !isIngestableMediaExtension(name)) return false;
  const mt = (asset.mediaType || "").toLowerCase();
  if (mt === "image" || mt === "still" || mt === "audio") return false;
  return kindForExtension(name) === "video";
}
