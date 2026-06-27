import sharp from "sharp";
import { scoutImageJpegQuality, scoutImageMaxWidth } from "@/lib/scout/imageConfig";

/** Downscale generated previs/diagram bytes for storage and cost (Vertex outputs ~1024px). */
export async function resizeScoutPreviewImage(buffer: Buffer): Promise<{
  buffer: Buffer;
  contentType: "image/jpeg" | "image/png";
}> {
  const maxWidth = scoutImageMaxWidth();
  if (!maxWidth || maxWidth >= 2048) {
    return { buffer, contentType: "image/png" };
  }

  const quality = scoutImageJpegQuality();
  const resized = await sharp(buffer)
    .resize({ width: maxWidth, withoutEnlargement: true })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();

  return { buffer: resized, contentType: "image/jpeg" };
}
