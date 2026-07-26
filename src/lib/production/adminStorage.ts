import { randomUUID } from "crypto";
import { getStorage } from "firebase-admin/storage";
import { getAdminApp } from "@/lib/firebase/admin";
import { productionAssetPath } from "@/lib/production/storage";

function getBucket() {
  const app = getAdminApp();
  if (!app) throw new Error("Firebase Admin is not configured");
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const storage = getStorage(app);
  return bucketName ? storage.bucket(bucketName) : storage.bucket();
}

/**
 * Upload a production image buffer and return a durable Firebase download URL
 * (token metadata, same pattern as client getDownloadURL).
 */
export async function uploadProductionImageBuffer(params: {
  projectId: string;
  folder: string;
  assetId?: string;
  buffer: Buffer;
  contentType: string;
  ext: string;
}): Promise<{ storagePath: string; storageUrl: string }> {
  const assetId = params.assetId ?? randomUUID();
  const path = productionAssetPath(params.projectId, params.folder, assetId, params.ext);
  return uploadImageBufferToPath({
    path,
    buffer: params.buffer,
    contentType: params.contentType,
  });
}

/**
 * Upload an image buffer to an explicit storage path and return a durable
 * Firebase download URL (token metadata, same pattern as client getDownloadURL).
 */
export async function uploadImageBufferToPath(params: {
  path: string;
  buffer: Buffer;
  contentType: string;
}): Promise<{ storagePath: string; storageUrl: string }> {
  const token = randomUUID();
  const bucketRef = getBucket();
  const file = bucketRef.file(params.path);
  await file.save(params.buffer, {
    contentType: params.contentType,
    metadata: {
      cacheControl: "public, max-age=31536000",
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  });
  const storageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketRef.name}/o/${encodeURIComponent(params.path)}?alt=media&token=${token}`;
  return { storagePath: params.path, storageUrl };
}
