import { FieldValue, Firestore } from "firebase-admin/firestore";
import { stripUndefined } from "@/lib/firebase/firestore";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";
import { ScriptDocument } from "@/lib/scriptWriter/types";
import { prepareScriptDocumentForFirestore } from "@/lib/screenplay/serialize";

export const SCRIPT_VERSIONS_SUBCOLLECTION = "scriptVersions";

export type ScriptVersionSource =
  | "generate"
  | "refine"
  | "confirm_analysis"
  | "manual"
  | "restore";

export interface ScriptVersionRecord {
  id: string;
  source: ScriptVersionSource;
  label?: string;
  title?: string;
  createdAt: string;
}

export async function archiveScriptVersion(
  db: Firestore,
  sessionId: string,
  script: ScriptDocument,
  source: ScriptVersionSource,
  label?: string
): Promise<string> {
  const ref = await db
    .collection(SCRIPT_WRITER_SESSIONS_COLLECTION)
    .doc(sessionId)
    .collection(SCRIPT_VERSIONS_SUBCOLLECTION)
    .add(
      stripUndefined({
        script: prepareScriptDocumentForFirestore(script),
        source,
        label,
        title: script.title,
        createdAt: FieldValue.serverTimestamp(),
      })
    );
  return ref.id;
}

export async function listScriptVersions(
  db: Firestore,
  sessionId: string,
  limit = 25
): Promise<ScriptVersionRecord[]> {
  let snap;
  try {
    snap = await db
      .collection(SCRIPT_WRITER_SESSIONS_COLLECTION)
      .doc(sessionId)
      .collection(SCRIPT_VERSIONS_SUBCOLLECTION)
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();
  } catch {
    snap = await db
      .collection(SCRIPT_WRITER_SESSIONS_COLLECTION)
      .doc(sessionId)
      .collection(SCRIPT_VERSIONS_SUBCOLLECTION)
      .limit(limit)
      .get();
  }

  return snap.docs.map((d) => {
    const data = d.data();
    const createdAt =
      data.createdAt && typeof data.createdAt === "object" && "toDate" in data.createdAt
        ? (data.createdAt as { toDate: () => Date }).toDate().toISOString()
        : typeof data.createdAt === "string"
          ? data.createdAt
          : new Date().toISOString();
    return {
      id: d.id,
      source: data.source as ScriptVersionSource,
      label: data.label as string | undefined,
      title: data.title as string | undefined,
      createdAt,
    };
  });
}

export async function loadScriptVersion(
  db: Firestore,
  sessionId: string,
  versionId: string
): Promise<ScriptDocument | null> {
  const snap = await db
    .collection(SCRIPT_WRITER_SESSIONS_COLLECTION)
    .doc(sessionId)
    .collection(SCRIPT_VERSIONS_SUBCOLLECTION)
    .doc(versionId)
    .get();
  if (!snap.exists) return null;
  return snap.data()?.script as ScriptDocument;
}
