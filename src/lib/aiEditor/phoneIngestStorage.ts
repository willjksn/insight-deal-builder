import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  type UploadTaskSnapshot,
} from "firebase/storage";
import { storage, isFirebaseConfigured } from "@/lib/firebase/config";

/** Soft cap for phone / browser clips (not camera-card volumes). */
export const AI_EDITOR_PHONE_MAX_MB = 500;

export type PhoneUploadProgressHandler = (progress: number) => void;

function ensureStorage() {
  if (!isFirebaseConfigured || !storage) {
    throw new Error("Firebase Storage is not configured.");
  }
  return storage;
}

export function aiEditorPhoneStoragePath(
  userId: string,
  projectId: string,
  fileId: string,
  ext: string
): string {
  return `ai-editor/${userId}/${projectId}/phone/${fileId}.${ext}`;
}

function extensionFromFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["mp4", "mov", "webm", "m4v", "3gp"].includes(fromName)) {
    return fromName === "m4v" ? "mp4" : fromName;
  }
  if (file.type.includes("webm")) return "webm";
  if (file.type.includes("quicktime")) return "mov";
  return "mp4";
}

export async function uploadAiEditorPhoneClip(
  userId: string,
  projectId: string,
  fileId: string,
  file: File,
  onProgress?: PhoneUploadProgressHandler
): Promise<{
  storagePath: string;
  storageUrl: string;
  mimeType: string;
  filename: string;
  sizeBytes: number;
  extension: string;
}> {
  const maxBytes = AI_EDITOR_PHONE_MAX_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`Video must be under ${AI_EDITOR_PHONE_MAX_MB} MB`);
  }
  if (!file.type.startsWith("video/") && !/\.(mp4|mov|webm|m4v|3gp)$/i.test(file.name)) {
    throw new Error("Choose a video from your phone (MP4 or MOV)");
  }

  const ext = extensionFromFile(file);
  const path = aiEditorPhoneStoragePath(userId, projectId, fileId, ext);
  const storageRef = ref(ensureStorage(), path);
  const contentType = file.type || `video/${ext === "mov" ? "quicktime" : ext}`;
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
  return {
    storagePath: path,
    storageUrl,
    mimeType: contentType,
    filename: file.name || `phone-clip.${ext}`,
    sizeBytes: file.size,
    extension: ext,
  };
}
