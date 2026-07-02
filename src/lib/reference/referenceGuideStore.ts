import { FieldValue, Firestore } from "firebase-admin/firestore";
import { stripUndefined } from "@/lib/firebase/firestore";
import { DEFAULT_REFERENCE_GUIDE, mergeReferenceSections } from "@/lib/reference/defaultGuide";
import {
  REFERENCE_GUIDE_COLLECTION,
  REFERENCE_GUIDE_DOC_ID,
  ReferenceGuideDocument,
  ReferenceGuideDraft,
} from "@/lib/reference/types";

export async function getPublishedReferenceGuide(db: Firestore): Promise<ReferenceGuideDocument> {
  const snap = await db.collection(REFERENCE_GUIDE_COLLECTION).doc(REFERENCE_GUIDE_DOC_ID).get();
  if (!snap.exists) {
    return DEFAULT_REFERENCE_GUIDE;
  }
  const data = snap.data() as {
    published?: ReferenceGuideDocument;
  };
  if (!data.published?.sections?.length) {
    return DEFAULT_REFERENCE_GUIDE;
  }
  return mergeReferenceSections(DEFAULT_REFERENCE_GUIDE, {
    ...DEFAULT_REFERENCE_GUIDE,
    ...data.published,
    sections: data.published.sections,
  });
}

export async function getReferenceGuideAdminState(db: Firestore) {
  const snap = await db.collection(REFERENCE_GUIDE_COLLECTION).doc(REFERENCE_GUIDE_DOC_ID).get();
  const published = await getPublishedReferenceGuide(db);
  if (!snap.exists) {
    return { published, draft: null as ReferenceGuideDraft | null };
  }
  const data = snap.data() as { draft?: ReferenceGuideDraft | null };
  return { published, draft: data.draft ?? null };
}

export async function saveReferenceDraft(
  db: Firestore,
  draft: ReferenceGuideDraft
): Promise<void> {
  await db.collection(REFERENCE_GUIDE_COLLECTION).doc(REFERENCE_GUIDE_DOC_ID).set(
    stripUndefined({
      draft,
      draftUpdatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true }
  );
}

export async function publishReferenceGuide(
  db: Firestore,
  guide: ReferenceGuideDocument,
  uid: string
): Promise<void> {
  await db.collection(REFERENCE_GUIDE_COLLECTION).doc(REFERENCE_GUIDE_DOC_ID).set(
    stripUndefined({
      published: {
        ...guide,
        updatedAt: new Date().toISOString(),
        updatedBy: uid,
      },
      draft: null,
      publishedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true }
  );
}

export async function discardReferenceDraft(db: Firestore): Promise<void> {
  await db.collection(REFERENCE_GUIDE_COLLECTION).doc(REFERENCE_GUIDE_DOC_ID).set(
    { draft: null },
    { merge: true }
  );
}
