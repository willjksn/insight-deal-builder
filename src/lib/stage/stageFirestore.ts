import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebase/config";
import { stripUndefined } from "@/lib/firebase/firestore";
import { StageBoard, StageElement } from "@/lib/stage/types";

export const STAGE_BOARDS_COLLECTION = "stageBoards";

function ensureDb() {
  if (!isFirebaseConfigured || !db) {
    throw new Error("Firebase is not configured");
  }
  return db;
}

export async function listStageBoardsForUser(userId: string): Promise<StageBoard[]> {
  const firestore = ensureDb();
  const q = query(
    collection(firestore, STAGE_BOARDS_COLLECTION),
    where("userId", "==", userId),
    where("projectId", "==", null)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StageBoard);
}

export async function listStageBoardsForProject(projectId: string): Promise<StageBoard[]> {
  const firestore = ensureDb();
  const q = query(
    collection(firestore, STAGE_BOARDS_COLLECTION),
    where("projectId", "==", projectId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as StageBoard);
}

export async function getStageBoard(boardId: string): Promise<StageBoard | null> {
  const firestore = ensureDb();
  const snap = await getDoc(doc(firestore, STAGE_BOARDS_COLLECTION, boardId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as StageBoard;
}

export async function createStageBoard(params: {
  userId: string;
  projectId?: string;
  title: string;
}): Promise<string> {
  const firestore = ensureDb();
  const ref = await addDoc(
    collection(firestore, STAGE_BOARDS_COLLECTION),
    stripUndefined({
      userId: params.userId,
      projectId: params.projectId ?? null,
      title: params.title,
      elements: [] as StageElement[],
      showGrid: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );
  return ref.id;
}

export async function saveStageBoard(
  boardId: string,
  patch: Partial<Pick<StageBoard, "title" | "elements" | "showGrid">>
): Promise<void> {
  const firestore = ensureDb();
  await updateDoc(
    doc(firestore, STAGE_BOARDS_COLLECTION, boardId),
    stripUndefined({
      ...patch,
      updatedAt: serverTimestamp(),
    })
  );
}

export async function ensureProjectStageBoard(
  userId: string,
  projectId: string,
  projectName: string
): Promise<StageBoard> {
  const existing = await listStageBoardsForProject(projectId);
  if (existing.length > 0) {
    return [...existing].sort((a, b) => {
      const bt = (b.updatedAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
      const at = (a.updatedAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
      return bt - at;
    })[0];
  }
  const id = await createStageBoard({
    userId,
    projectId,
    title: `${projectName} — Stage plan`,
  });
  const board = await getStageBoard(id);
  if (!board) throw new Error("Failed to create stage board");
  return board;
}

export async function ensurePersonalStageBoard(userId: string): Promise<StageBoard> {
  const existing = await listStageBoardsForUser(userId);
  if (existing.length > 0) return existing[0];
  const id = await createStageBoard({ userId, title: "My stage planner" });
  const board = await getStageBoard(id);
  if (!board) throw new Error("Failed to create stage board");
  return board;
}
