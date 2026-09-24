import { randomUUID } from "crypto";
import { uploadImageBufferToPath } from "@/lib/production/adminStorage";

export async function storeGeneratedMedia(params: {
  userId: string;
  guideId: string;
  shotId: string;
  assetType: string;
  assetId: string;
  sourceUrl: string;
}): Promise<{ storagePath: string; storageUrl: string; mimeType: string }> {
  const response = await fetch(params.sourceUrl);
  if (!response.ok) throw new Error("Could not download the generated file");
  const mimeType = (response.headers.get("content-type") || "application/octet-stream").split(";")[0].trim();
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error("Generated file was empty");
  const ext = mimeType.includes("png")
    ? "png"
    : mimeType.includes("webp")
      ? "webp"
      : mimeType.startsWith("video/")
        ? "mp4"
        : "jpg";
  const storagePath = `shoot-guide/${params.userId}/${params.guideId}/shots/${params.shotId}/${params.assetType}/${params.assetId}-${randomUUID()}.${ext}`;
  const saved = await uploadImageBufferToPath({
    path: storagePath,
    buffer,
    contentType: mimeType.startsWith("video/") ? "video/mp4" : mimeType,
  });
  return { ...saved, mimeType: mimeType.startsWith("video/") ? "video/mp4" : mimeType };
}
