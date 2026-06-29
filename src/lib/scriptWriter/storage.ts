import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  UploadTaskSnapshot,
} from "firebase/storage";
import { storage, isFirebaseConfigured } from "@/lib/firebase/config";
import { SCRIPT_MAX_IMAGE_MB, SCRIPT_MAX_VIDEO_MB } from "@/lib/scriptWriter/constants";

export type UploadProgressHandler = (progress: number) => void;

function ensureStorage() {
  if (!isFirebaseConfigured || !storage) {
    throw new Error("Firebase Storage is not configured.");
  }
  return storage;
}

export function scriptWriterStoragePath(
  userId: string,
  sessionId: string,
  fileId: string,
  ext: string
): string {
  return `script-writer/${userId}/${sessionId}/${fileId}.${ext}`;
}

function extensionFromFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp", "heic", "mp4", "mov", "webm"].includes(fromName)) {
    if (fromName === "jpeg") return "jpg";
    return fromName;
  }
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type.startsWith("video/")) {
    if (file.type.includes("webm")) return "webm";
    if (file.type.includes("quicktime")) return "mov";
    return "mp4";
  }
  return "jpg";
}

export async function uploadScriptWriterFile(
  userId: string,
  sessionId: string,
  fileId: string,
  file: File,
  onProgress?: UploadProgressHandler
): Promise<{ storagePath: string; storageUrl: string; mimeType: string }> {
  const isVideo = file.type.startsWith("video/");
  const maxBytes = (isVideo ? SCRIPT_MAX_VIDEO_MB : SCRIPT_MAX_IMAGE_MB) * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(
      isVideo
        ? `Video must be under ${SCRIPT_MAX_VIDEO_MB} MB`
        : `Image must be under ${SCRIPT_MAX_IMAGE_MB} MB`
    );
  }
  if (!isVideo && !file.type.startsWith("image/")) {
    throw new Error("File must be an image or video");
  }
  if (isVideo && !file.type.startsWith("video/")) {
    throw new Error("Video must be MP4, MOV, or WebM");
  }

  const ext = extensionFromFile(file);
  const path = scriptWriterStoragePath(userId, sessionId, fileId, ext);
  const storageRef = ref(ensureStorage(), path);
  const task = uploadBytesResumable(storageRef, file, { contentType: file.type });

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
  return { storagePath: path, storageUrl, mimeType: file.type };
}
