import { Firestore, CollectionReference } from "firebase-admin/firestore";
import { getAdminApp, getAdminDb, getAdminStorage } from "@/lib/firebase/admin";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";
import { SCRIPT_VERSIONS_SUBCOLLECTION } from "@/lib/scriptWriter/scriptVersions";
import {
  RESOURCE_MEMBERS_SUBCOLLECTION,
} from "@/lib/projectAccess/server";
import { RESOURCE_NOTES_SUBCOLLECTION } from "@/lib/sharedNotes/server";

const SESSION_SUBCOLLECTIONS = [
  SCRIPT_VERSIONS_SUBCOLLECTION,
  RESOURCE_MEMBERS_SUBCOLLECTION,
  RESOURCE_NOTES_SUBCOLLECTION,
] as const;

async function deleteQueryBatch(
  db: Firestore,
  collectionRef: CollectionReference,
  batchSize = 100
): Promise<void> {
  const snap = await collectionRef.limit(batchSize).get();
  if (snap.empty) return;
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  if (snap.size >= batchSize) {
    await deleteQueryBatch(db, collectionRef, batchSize);
  }
}

async function deleteScriptWriterStorage(userId: string, sessionId: string): Promise<void> {
  const app = getAdminApp();
  if (!app) return;
  const storage = getAdminStorage();
  if (!storage) return;
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
  const prefix = `script-writer/${userId}/${sessionId}/`;
  const [files] = await bucket.getFiles({ prefix });
  await Promise.all(files.map((file) => file.delete().catch(() => undefined)));
}

export async function deleteScriptWriterSession(sessionId: string, ownerUserId: string): Promise<void> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");

  const ref = db.collection(SCRIPT_WRITER_SESSIONS_COLLECTION).doc(sessionId);

  for (const sub of SESSION_SUBCOLLECTIONS) {
    await deleteQueryBatch(db, ref.collection(sub));
  }

  await deleteScriptWriterStorage(ownerUserId, sessionId);
  await ref.delete();
}
