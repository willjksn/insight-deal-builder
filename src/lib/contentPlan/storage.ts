import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
  type UploadTaskSnapshot,
} from "firebase/storage";
import { isFirebaseConfigured, storage } from "@/lib/firebase/config";

const MAX_MB = 8;

function ensureStorage() {
  if (!isFirebaseConfigured || !storage) {
    throw new Error("Firebase Storage is not configured.");
  }
  return storage;
}

function extensionFromFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && ["jpg", "jpeg", "png", "webp", "gif"].includes(fromName)) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "jpg";
}

/** Upload a reference still for a Content Plan shot. */
export async function uploadContentPlanShotImage(
  userId: string,
  planId: string,
  shotId: string,
  file: File
): Promise<{ storagePath: string; storageUrl: string }> {
  if (!file.type.startsWith("image/")) throw new Error("File must be an image");
  const maxBytes = MAX_MB * 1024 * 1024;
  if (file.size > maxBytes) throw new Error(`Image must be under ${MAX_MB} MB`);

  const ext = extensionFromFile(file);
  const storagePath = `content-plans/${userId}/${planId}/shots/${shotId}.${ext}`;
  const storageRef = ref(ensureStorage(), storagePath);
  const task = uploadBytesResumable(storageRef, file, {
    contentType: file.type || "image/jpeg",
  });

  await new Promise<void>((resolve, reject) => {
    task.on(
      "state_changed",
      (_snap: UploadTaskSnapshot) => undefined,
      reject,
      () => resolve()
    );
  });

  const storageUrl = await getDownloadURL(storageRef);
  return { storagePath, storageUrl };
}
