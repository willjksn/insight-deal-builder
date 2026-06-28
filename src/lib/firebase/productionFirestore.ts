import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  limit,
  serverTimestamp,
  Unsubscribe,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase/config";
import { stripUndefined } from "@/lib/firebase/firestore";
import { Project } from "@/lib/types";
import { ProductionBoard } from "@/lib/production/types";
import { createProductionBoardFromProject } from "@/lib/production/defaults";
import { normalizeStoryLinks } from "@/lib/production/storyLinks";

export const PRODUCTION_BOARDS_COLLECTION = "productionBoards";

/** Deep-clean board payloads so Firestore never sees undefined (invalid in nested fields). */
function sanitizeBoardPayload(
  data: Partial<Omit<ProductionBoard, "id" | "createdAt">>
): Partial<Omit<ProductionBoard, "id" | "createdAt">> {
  return stripUndefined(JSON.parse(JSON.stringify(data))) as Partial<
    Omit<ProductionBoard, "id" | "createdAt">
  >;
}

function ensureDb() {
  if (!isFirebaseConfigured || !db) {
    throw new Error("Firebase is not configured.");
  }
  return db;
}

export async function getProductionBoardByProject(projectId: string): Promise<ProductionBoard | null> {
  const database = ensureDb();
  const q = query(
    collection(database, PRODUCTION_BOARDS_COLLECTION),
    where("projectId", "==", projectId),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() } as ProductionBoard;
}

export function subscribeProductionBoardByProject(
  projectId: string,
  callback: (board: ProductionBoard | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const q = query(
    collection(ensureDb(), PRODUCTION_BOARDS_COLLECTION),
    where("projectId", "==", projectId),
    limit(1)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        callback(null);
        return;
      }
      const d = snapshot.docs[0];
      callback({ id: d.id, ...d.data() } as ProductionBoard);
    },
    (err) => onError?.(err instanceof Error ? err : new Error(String(err)))
  );
}

export async function ensureProductionBoard(
  project: Project,
  userId: string
): Promise<ProductionBoard> {
  const existing = await getProductionBoardByProject(project.id);
  if (existing) {
    const { links, changed } = normalizeStoryLinks(existing.storyLinks ?? []);
    if (changed) {
      await saveProductionBoard(existing.id, { storyLinks: links });
      return { ...existing, storyLinks: links };
    }
    return existing;
  }

  const ref = await addDoc(
    collection(ensureDb(), PRODUCTION_BOARDS_COLLECTION),
    stripUndefined({
      ...createProductionBoardFromProject(project, userId),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  const snap = await getDoc(ref);
  return { id: ref.id, ...snap.data() } as ProductionBoard;
}

export async function saveProductionBoard(
  boardId: string,
  data: Partial<Omit<ProductionBoard, "id" | "createdAt">>
): Promise<void> {
  const { updatedAt: _clientUpdatedAt, ...payload } = data;
  await updateDoc(
    doc(ensureDb(), PRODUCTION_BOARDS_COLLECTION, boardId),
    stripUndefined({
      ...sanitizeBoardPayload(payload),
      updatedAt: serverTimestamp(),
    })
  );
}
