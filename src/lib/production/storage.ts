import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  UploadTaskSnapshot,
} from "firebase/storage";
import { storage, isFirebaseConfigured } from "@/lib/firebase/config";

const MAX_MB = 10;
const STORY_DOC_MAX_MB = 25;

const STORY_DOC_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

function ensureStorage() {
  if (!isFirebaseConfigured || !storage) {
    throw new Error("Firebase Storage is not configured.");
  }
  return storage;
}

function extensionFromFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  if (file.type === "image/heic" || file.type === "image/heif") return "jpg";
  return "jpg";
}

function imageContentType(file: File): string {
  if (file.type.startsWith("image/")) return file.type;
  const ext = extensionFromFile(file);
  const byExt: Record<string, string> = {
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    heic: "image/jpeg",
    heif: "image/jpeg",
  };
  return byExt[ext] ?? "image/jpeg";
}

function documentContentType(file: File): string {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  const ext = extensionFromDocument(file);
  const byExt: Record<string, string> = {
    pdf: "application/pdf",
    txt: "text/plain",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
  return byExt[ext] ?? file.type ?? "application/octet-stream";
}

function extensionFromDocument(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["pdf", "doc", "docx", "txt", "fdx", "fountain"].includes(fromName)) {
    return fromName;
  }
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "text/plain") return "txt";
  if (file.type === "application/msword") return "doc";
  if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return "docx";
  }
  if (file.type.startsWith("image/")) return extensionFromFile(file);
  return "bin";
}

function isImageFileName(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase();
  return Boolean(ext && ["jpg", "jpeg", "png", "webp", "gif", "heic", "heif"].includes(ext));
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/") || isImageFileName(file.name);
}

function isStoryDocument(file: File): boolean {
  if (isImageFile(file)) return true;
  if (STORY_DOC_TYPES.has(file.type)) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return Boolean(ext && ["pdf", "doc", "docx", "txt", "fdx", "fountain"].includes(ext));
}

async function uploadToProduction(
  projectId: string,
  folder: string,
  assetId: string,
  file: File,
  maxMb: number,
  contentType: string,
  onProgress?: (pct: number) => void
): Promise<{ storagePath: string; storageUrl: string }> {
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) throw new Error(`File must be under ${maxMb} MB`);

  const ext =
    isStoryDocument(file) && !contentType.startsWith("image/")
      ? extensionFromDocument(file)
      : extensionFromFile(file);
  const path = productionAssetPath(projectId, folder, assetId, ext);
  const storageRef = ref(ensureStorage(), path);
  const task = uploadBytesResumable(storageRef, file, { contentType });

  await new Promise<void>((resolve, reject) => {
    task.on(
      "state_changed",
      (snap: UploadTaskSnapshot) => {
        const pct = snap.totalBytes > 0 ? (snap.bytesTransferred / snap.totalBytes) * 100 : 0;
        onProgress?.(pct);
      },
      reject,
      () => resolve()
    );
  });

  const storageUrl = await getDownloadURL(storageRef);
  return { storagePath: path, storageUrl };
}

export async function uploadProductionDocument(
  projectId: string,
  folder: string,
  assetId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ storagePath: string; storageUrl: string; fileName: string }> {
  if (!isStoryDocument(file)) {
    throw new Error("Upload a PDF, Word doc, text file, or image.");
  }
  const maxMb = isImageFile(file) ? MAX_MB : STORY_DOC_MAX_MB;
  const contentType = isImageFile(file) ? imageContentType(file) : documentContentType(file);
  const result = await uploadToProduction(
    projectId,
    folder,
    assetId,
    file,
    maxMb,
    contentType,
    onProgress
  );
  return { ...result, fileName: file.name };
}

export function productionAssetPath(
  projectId: string,
  folder: string,
  assetId: string,
  ext: string
): string {
  return `production/${projectId}/${folder}/${assetId}.${ext}`;
}

export async function uploadProductionImage(
  projectId: string,
  folder: string,
  assetId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ storagePath: string; storageUrl: string }> {
  const maxBytes = MAX_MB * 1024 * 1024;
  if (file.size > maxBytes) throw new Error(`Image must be under ${MAX_MB} MB`);
  if (!isImageFile(file)) throw new Error("File must be an image");

  return uploadToProduction(
    projectId,
    folder,
    assetId,
    file,
    MAX_MB,
    imageContentType(file),
    onProgress
  );
}
