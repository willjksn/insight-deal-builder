import { randomUUID } from "crypto";
import { getAdminStorage } from "@/lib/firebase/admin";
import { CreatorError } from "@/lib/creators/errors";
import type { CreatorDocumentKind } from "@/lib/creators/types";

const MAX_BYTES = 12 * 1024 * 1024;

function getBucket() {
  const storage = getAdminStorage();
  if (!storage) throw new CreatorError("NOT_CONFIGURED", "Firebase Storage is not configured");
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  return bucketName ? storage.bucket(bucketName) : storage.bucket();
}

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new CreatorError("VALIDATION_FAILED", "Invalid file data");
  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > MAX_BYTES) {
    throw new CreatorError("VALIDATION_FAILED", "File is too large (max 12 MB)");
  }
  return { contentType, buffer };
}

function extensionFor(contentType: string, fileName?: string): string {
  const fromName = fileName?.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  if (contentType === "application/pdf") return "pdf";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  if (contentType.startsWith("image/")) return "jpg";
  return "bin";
}

/**
 * Upload a creator document via Admin SDK. Returns the storage path
 * (never a public URL — sensitive docs use signed URLs).
 */
export async function uploadCreatorDocumentFile(
  creatorId: string,
  kind: CreatorDocumentKind,
  dataUrl: string,
  fileName?: string
): Promise<{ storagePath: string; contentType: string }> {
  const { buffer, contentType } = dataUrlToBuffer(dataUrl);
  const ext = extensionFor(contentType, fileName);
  const storagePath = `creators/${creatorId}/${kind}/${randomUUID()}.${ext}`;
  const file = getBucket().file(storagePath);
  await file.save(buffer, {
    contentType,
    metadata: { cacheControl: "private, max-age=0" },
  });
  return { storagePath, contentType };
}

export async function getCreatorDocumentSignedUrl(
  storagePath: string,
  ttlMs = 60 * 60 * 1000
): Promise<string> {
  const file = getBucket().file(storagePath);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + ttlMs,
  });
  return url;
}

export async function deleteCreatorDocumentFile(storagePath: string): Promise<void> {
  try {
    await getBucket().file(storagePath).delete({ ignoreNotFound: true });
  } catch {
    // Best-effort cleanup — record removal still proceeds.
  }
}
