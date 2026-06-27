import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  UploadTaskSnapshot,
} from "firebase/storage";
import { storage, isFirebaseConfigured } from "@/lib/firebase/config";
import { SCOUT_MAX_IMAGE_MB } from "./constants";

export type UploadProgressHandler = (progress: number) => void;

function ensureStorage() {
  if (!isFirebaseConfigured || !storage) {
    throw new Error("Firebase Storage is not configured.");
  }
  return storage;
}

export function scoutImageStoragePath(
  userId: string,
  scoutProjectId: string,
  imageId: string,
  ext: string
): string {
  return `shot-scout/${userId}/${scoutProjectId}/${imageId}.${ext}`;
}

function extensionFromFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp", "heic"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export async function uploadScoutImage(
  userId: string,
  scoutProjectId: string,
  imageId: string,
  file: File,
  onProgress?: UploadProgressHandler
): Promise<{ storagePath: string; storageUrl: string }> {
  const maxBytes = SCOUT_MAX_IMAGE_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`Image must be under ${SCOUT_MAX_IMAGE_MB} MB`);
  }
  if (!file.type.startsWith("image/")) {
    throw new Error("File must be an image");
  }

  const ext = extensionFromFile(file);
  const path = scoutImageStoragePath(userId, scoutProjectId, imageId, ext);
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
  return { storagePath: path, storageUrl };
}
