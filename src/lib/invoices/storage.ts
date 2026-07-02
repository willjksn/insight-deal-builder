import { getStorage } from "firebase-admin/storage";
import { getAdminApp } from "@/lib/firebase/admin";

const MAX_PDF_BYTES = 5 * 1024 * 1024;

function getBucket() {
  const app = getAdminApp();
  if (!app) throw new Error("Firebase Admin is not configured");
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const storage = getStorage(app);
  return bucketName ? storage.bucket(bucketName) : storage.bucket();
}

export async function uploadPaymentInvoicePdf(
  agreementId: string,
  invoiceId: string,
  buffer: Buffer
): Promise<string> {
  if (buffer.length > MAX_PDF_BYTES) {
    throw new Error("Invoice PDF is too large");
  }
  const path = `payment-invoices/${agreementId}/${invoiceId}.pdf`;
  const file = getBucket().file(path);
  await file.save(buffer, {
    contentType: "application/pdf",
    metadata: { cacheControl: "private, max-age=0" },
  });
  return path;
}

export async function getPaymentInvoiceSignedUrl(storagePath: string, ttlMs = 60 * 60 * 1000): Promise<string> {
  const file = getBucket().file(storagePath);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + ttlMs,
  });
  return url;
}
