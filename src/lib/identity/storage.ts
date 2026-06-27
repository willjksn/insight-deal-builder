import { randomBytes } from "crypto";
import { getStorage } from "firebase-admin/storage";
import { getAdminApp } from "@/lib/firebase/admin";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function dataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data");
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Image is too large (max 8 MB per side)");
  }
  return { contentType: match[1], buffer };
}

function getBucket() {
  const app = getAdminApp();
  if (!app) throw new Error("Firebase Admin is not configured");
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const storage = getStorage(app);
  return bucketName ? storage.bucket(bucketName) : storage.bucket();
}

export async function uploadIdentityImage(
  agreementId: string,
  partyId: string,
  side: "front" | "back",
  dataUrl: string
): Promise<string> {
  const { buffer, contentType } = dataUrlToBuffer(dataUrl);
  const path = `identity-verification/${agreementId}/${partyId}/${side}.jpg`;
  const file = getBucket().file(path);
  await file.save(buffer, {
    contentType,
    metadata: { cacheControl: "private, max-age=0" },
  });
  return path;
}

export async function getIdentityImageSignedUrl(storagePath: string, ttlMs = 60 * 60 * 1000): Promise<string> {
  const file = getBucket().file(storagePath);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + ttlMs,
  });
  return url;
}

export function newIdentityRecordId(): string {
  return randomBytes(16).toString("hex");
}
