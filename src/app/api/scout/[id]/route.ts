import { NextRequest, NextResponse } from "next/server";
import { Firestore, CollectionReference } from "firebase-admin/firestore";
import { apiErrorStatus, assertCanUseShotScout, requireAuthUser } from "@/lib/api/routeAuth";
import { getAdminApp, getAdminDb, getAdminStorage } from "@/lib/firebase/admin";

export const runtime = "nodejs";

const SUBCOLLECTIONS = ["images", "analysis", "dpPlans", "shotLists", "previews"] as const;

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

async function deleteStoragePrefix(userId: string, scoutId: string): Promise<void> {
  const app = getAdminApp();
  if (!app) return;
  const storage = getAdminStorage();
  if (!storage) return;
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const bucket = bucketName ? storage.bucket(bucketName) : storage.bucket();
  const prefix = `shot-scout/${userId}/${scoutId}/`;
  const [files] = await bucket.getFiles({ prefix });
  await Promise.all(files.map((file) => file.delete().catch(() => undefined)));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { uid, appUser } = await requireAuthUser(_request);
    assertCanUseShotScout(appUser);

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const ref = db.collection("shotScoutProjects").doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new Error("Scout session not found");
    if (snap.data()?.userId !== uid) throw new Error("Not authorized");

    for (const sub of SUBCOLLECTIONS) {
      await deleteQueryBatch(db, ref.collection(sub));
    }

    await deleteStoragePrefix(uid, id);
    await ref.delete();

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
