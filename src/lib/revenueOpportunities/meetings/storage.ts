import { ref, uploadBytesResumable, getDownloadURL, UploadTaskSnapshot } from "firebase/storage";
import { storage, isFirebaseConfigured } from "@/lib/firebase/config";

/**
 * Storage upload budget (Firebase). Larger than Gemini inline transcription so long
 * discovery calls can still be archived; transcription stays capped separately.
 */
export const MAX_MEETING_UPLOAD_MB = 100;
/** Gemini inline-audio cap used by transcription. */
export const MAX_MEETING_TRANSCRIBE_MB = 20;

const AUDIO_EXTS = new Set(["mp3", "m4a", "wav", "aac", "ogg", "webm", "flac", "mp4"]);

function ensureStorage() {
  if (!isFirebaseConfigured || !storage) {
    throw new Error("Firebase Storage is not configured.");
  }
  return storage;
}

function audioExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && AUDIO_EXTS.has(fromName)) return fromName;
  if (file.type.includes("mpeg")) return "mp3";
  if (file.type.includes("wav")) return "wav";
  if (file.type.includes("webm")) return "webm";
  if (file.type.includes("ogg")) return "ogg";
  if (file.type.includes("aac")) return "aac";
  return "m4a";
}

export function meetingAudioPath(meetingId: string, ext: string): string {
  return `revenue/meetings/${meetingId}/audio.${ext}`;
}

export function isAudioFile(file: File): boolean {
  if (file.type.startsWith("audio/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return Boolean(ext && AUDIO_EXTS.has(ext));
}

export function meetingAudioExceedsTranscribeLimit(sizeBytes: number): boolean {
  return sizeBytes > MAX_MEETING_TRANSCRIBE_MB * 1024 * 1024;
}

export async function uploadMeetingAudio(
  meetingId: string,
  file: File,
  onProgress?: (pct: number) => void
): Promise<{
  storagePath: string;
  storageUrl: string;
  contentType: string;
  exceedsTranscribeLimit: boolean;
}> {
  if (!isAudioFile(file)) throw new Error("Upload an audio file (mp3, m4a, wav, webm, …).");
  const maxBytes = MAX_MEETING_UPLOAD_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`Audio must be under ${MAX_MEETING_UPLOAD_MB} MB to upload.`);
  }

  const contentType = file.type && file.type.startsWith("audio/") ? file.type : "audio/mpeg";
  const path = meetingAudioPath(meetingId, audioExtension(file));
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
  return {
    storagePath: path,
    storageUrl,
    contentType,
    exceedsTranscribeLimit: meetingAudioExceedsTranscribeLimit(file.size),
  };
}
