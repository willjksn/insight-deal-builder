import type { MediaAsset } from "@/lib/aiEditor/types";

/** Local media operations — implemented by Desktop Agent; mock for tests/UI without agent. */
export interface MediaEngine {
  probe(filePath: string): Promise<Partial<MediaAsset>>;
  createThumbnail?(filePath: string): Promise<{ dataUrl?: string; path?: string }>;
}

export function extensionOf(filename: string): string {
  const i = filename.lastIndexOf(".");
  return i >= 0 ? filename.slice(i + 1).toLowerCase() : "";
}

export function inferMediaType(filename: string): MediaAsset["mediaType"] {
  const ext = extensionOf(filename);
  if (["mp4", "mov", "mxf", "mkv", "avi", "r3d", "braw"].includes(ext)) return "video";
  if (["wav", "aiff", "aif", "mp3", "m4a", "aac"].includes(ext)) return "audio";
  if (["jpg", "jpeg", "png", "tif", "tiff", "exr", "dng"].includes(ext)) return "image";
  return "other";
}

/** Deterministic mock probe for unit tests / agent-offline demo. */
export const mockMediaEngine: MediaEngine = {
  async probe(filePath: string) {
    const filename = filePath.replace(/\\/g, "/").split("/").pop() || "unknown";
    const mediaType = inferMediaType(filename);
    return {
      filename,
      originalFilename: filename,
      extension: extensionOf(filename),
      mediaType,
      codec: mediaType === "video" ? "h264" : mediaType === "audio" ? "pcm_s24le" : undefined,
      container: extensionOf(filename),
      resolution: mediaType === "video" ? "1920x1080" : undefined,
      frameRate: mediaType === "video" ? 23.976 : undefined,
      durationSeconds: mediaType === "video" || mediaType === "audio" ? 12.5 : undefined,
      onlineStatus: "online" as const,
    };
  },
  async createThumbnail() {
    return { dataUrl: undefined };
  },
};
