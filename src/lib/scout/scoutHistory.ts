import { FieldValue, Firestore } from "firebase-admin/firestore";
import { stripUndefined } from "@/lib/firebase/firestore";
import { SCOUT_PROJECTS_COLLECTION } from "@/lib/firebase/scoutFirestore";
import {
  ScoutLocationAnalysis,
  ScoutDpPlan,
  ScoutShotList,
  ScoutShotListItem,
} from "@/lib/scout/types";

export type ScoutHistoryKind = "shotLists" | "dpPlans" | "analysis";

export type ScoutHistorySource = "ai" | "manual_edit" | "restore";

export interface ScoutHistoryEntry {
  id: string;
  kind: ScoutHistoryKind;
  source?: ScoutHistorySource;
  label?: string;
  createdAt: string;
  summary?: string;
}

function toIso(ts: unknown): string {
  if (ts && typeof ts === "object" && "toDate" in ts) {
    return (ts as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof ts === "string") return ts;
  return new Date().toISOString();
}

export async function listScoutHistory(
  db: Firestore,
  scoutId: string,
  kind: ScoutHistoryKind,
  limit = 20
): Promise<ScoutHistoryEntry[]> {
  const ref = db.collection(SCOUT_PROJECTS_COLLECTION).doc(scoutId).collection(kind);
  let snap;
  try {
    snap = await ref.orderBy("createdAt", "desc").limit(limit).get();
  } catch {
    snap = await ref.limit(limit).get();
  }

  return snap.docs.map((d) => {
    const data = d.data();
    let summary: string | undefined;
    if (kind === "shotLists" && Array.isArray(data.shots)) {
      summary = `${data.shots.length} shots`;
    } else if (kind === "dpPlans" && data.lightingPlan) {
      summary = "DP plan";
    } else if (kind === "analysis" && data.overallScore != null) {
      summary = `Score ${data.overallScore}`;
    }
    return {
      id: d.id,
      kind,
      source: data.source as ScoutHistorySource | undefined,
      label: data.label as string | undefined,
      createdAt: toIso(data.createdAt),
      summary,
    };
  });
}

export async function loadScoutHistoryDocument(
  db: Firestore,
  scoutId: string,
  kind: ScoutHistoryKind,
  documentId: string
): Promise<Record<string, unknown> | null> {
  const snap = await db
    .collection(SCOUT_PROJECTS_COLLECTION)
    .doc(scoutId)
    .collection(kind)
    .doc(documentId)
    .get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}

export async function archiveScoutShotListManual(
  db: Firestore,
  scoutId: string,
  shotList: ScoutShotList,
  label?: string
): Promise<string> {
  const { id: _id, createdAt: _c, updatedAt: _u, ...payload } = shotList;
  const ref = await db
    .collection(SCOUT_PROJECTS_COLLECTION)
    .doc(scoutId)
    .collection("shotLists")
    .add(
      stripUndefined({
        ...payload,
        source: "manual_edit",
        label: label ?? "Manual edit",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    );
  return ref.id;
}

export function normalizeShotListItems(shots: ScoutShotListItem[]): ScoutShotListItem[] {
  return shots.map((s, index) => ({
    ...s,
    shotNumber: index + 1,
  }));
}

export type { ScoutLocationAnalysis, ScoutDpPlan, ScoutShotList };
