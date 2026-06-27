import { randomUUID } from "crypto";
import { getAdminApp, getAdminStorage } from "@/lib/firebase/admin";

function getBucket() {
  const app = getAdminApp();
  if (!app) throw new Error("Firebase Admin is not configured");
  const storage = getAdminStorage();
  if (!storage) throw new Error("Firebase Admin Storage is not configured");
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  return bucketName ? storage.bucket(bucketName) : storage.bucket();
}

/** Upload a generated previs PNG and return a permanent download URL. */
export async function uploadScoutPreviewImage(
  userId: string,
  scoutProjectId: string,
  previewId: string,
  imageBuffer: Buffer,
  contentType: "image/jpeg" | "image/png" = "image/png"
): Promise<string> {
  const token = randomUUID();
  const ext = contentType === "image/jpeg" ? "jpg" : "png";
  const path = `shot-scout/${userId}/${scoutProjectId}/previews/${previewId}.${ext}`;
  const file = getBucket().file(path);
  await file.save(imageBuffer, {
    contentType,
    metadata: {
      cacheControl: "public, max-age=31536000",
      metadata: { firebaseStorageDownloadTokens: token },
    },
  });
  const bucket = getBucket().name;
  return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}
