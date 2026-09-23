import {
  getDownloadURL,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { isFirebaseConfigured, storage } from "@/lib/firebase/config";
import type { ShootGuideReferenceKind } from "./types";

const MAX_MB = 8;

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
  return "jpg";
}

export async function uploadShootGuideReference(
  userId: string,
  guideId: string,
  kind: ShootGuideReferenceKind,
  fileId: string,
  file: File
): Promise<{ storagePath: string; storageUrl: string; fileName: string }> {
  if (!file.type.startsWith("image/") && !/\.(jpe?g|png|webp|gif|heic|heif)$/i.test(file.name)) {
    throw new Error("File must be an image");
  }
  const maxBytes = MAX_MB * 1024 * 1024;
  if (file.size > maxBytes) throw new Error(`Image must be under ${MAX_MB} MB`);

  const ext = extensionFromFile(file);
  const storagePath = `shoot-guide/${userId}/${guideId}/${kind}/${fileId}.${ext}`;
  const storageRef = ref(ensureStorage(), storagePath);
  const task = uploadBytesResumable(storageRef, file, {
    contentType: file.type.startsWith("image/") ? file.type : "image/jpeg",
  });

  await new Promise<void>((resolve, reject) => {
    task.on("state_changed", () => undefined, reject, () => resolve());
  });

  const storageUrl = await getDownloadURL(storageRef);
  return { storagePath, storageUrl, fileName: file.name };
}
