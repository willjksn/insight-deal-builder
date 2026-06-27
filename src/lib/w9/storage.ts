import { getStorage } from "firebase-admin/storage";
import { getAdminApp } from "@/lib/firebase/admin";

const MAX_PDF_BYTES = 10 * 1024 * 1024;

function getBucket() {
  const app = getAdminApp();
  if (!app) throw new Error("Firebase Admin is not configured");
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const storage = getStorage(app);
  return bucketName ? storage.bucket(bucketName) : storage.bucket();
}

function pdfDataUrlToBuffer(dataUrl: string): { buffer: Buffer; contentType: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid PDF data");
  const contentType = match[1];
  if (contentType !== "application/pdf") {
    throw new Error("W-9 must be a PDF file");
  }
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > MAX_PDF_BYTES) {
    throw new Error("PDF is too large (max 10 MB)");
  }
  return { contentType, buffer };
}

export async function uploadW9Pdf(agreementId: string, dataUrl: string): Promise<string> {
  const { buffer, contentType } = pdfDataUrlToBuffer(dataUrl);
  const path = `w9-documents/${agreementId}/w9.pdf`;
  const file = getBucket().file(path);
  await file.save(buffer, {
    contentType,
    metadata: { cacheControl: "private, max-age=0" },
  });
  return path;
}

export async function getW9SignedUrl(storagePath: string, ttlMs = 60 * 60 * 1000): Promise<string> {
  const file = getBucket().file(storagePath);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + ttlMs,
  });
  return url;
}
