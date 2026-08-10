import {
  FieldValue,
  type DocumentReference,
  type Firestore,
} from "firebase-admin/firestore";
import { CONTENT_PLANS_COLLECTION } from "@/lib/contentPlan/collections";
import {
  applyBoardShootProgressToContentShots,
  applyContentPlanShootProgressToDays,
} from "@/lib/contentPlan/syncShootProgressToBoard";
import type { ContentPlan } from "@/lib/contentPlan/types";
import { stripUndefined } from "@/lib/firebase/firestore";
import type { ProductionBoard } from "@/lib/production/types";

const PRODUCTION_BOARDS_COLLECTION = "productionBoards";

async function loadLinkedPlanAndBoard(params: {
  db: Firestore;
  uid: string;
  planId: string;
}): Promise<{
  plan: ContentPlan;
  planRef: DocumentReference;
  board: ProductionBoard;
  boardRef: DocumentReference;
  projectId: string;
}> {
  const { db, uid, planId } = params;

  const planRef = db.collection(CONTENT_PLANS_COLLECTION).doc(planId);
  const planSnap = await planRef.get();
  if (!planSnap.exists) throw new Error("Content plan not found");
  const plan = { id: planSnap.id, ...planSnap.data() } as ContentPlan;
  if (plan.userId !== uid) throw new Error("Not authorized");
  if (!plan.projectId) {
    throw new Error("This plan is not linked to a project yet. Create a project first.");
  }
  if (!plan.shots?.length) {
    throw new Error("Generate shots before syncing shoot progress.");
  }

  const projectId = plan.projectId;
  const boardSnap = await db
    .collection(PRODUCTION_BOARDS_COLLECTION)
    .where("projectId", "==", projectId)
    .limit(1)
    .get();
  if (boardSnap.empty) {
    throw new Error("No production board found for the linked project.");
  }

  const boardDoc = boardSnap.docs[0]!;
  const board = { id: boardDoc.id, ...boardDoc.data() } as ProductionBoard;
  return { plan, planRef, board, boardRef: boardDoc.ref, projectId };
}

/**
 * Push Shoot Mode progress from a Content Plan onto its linked production board.
 * Does not regenerate script/shots — only overlays done + shoot notes.
 */
export async function syncShootProgressFromContentPlan(params: {
  db: Firestore;
  uid: string;
  planId: string;
}): Promise<{
  projectId: string;
  productionBoardId: string;
  updatedCount: number;
  plan: ContentPlan;
}> {
  const { plan, board, boardRef, projectId } = await loadLinkedPlanAndBoard(params);
  const { days, updatedCount } = applyContentPlanShootProgressToDays(
    board.productionDays || [],
    plan.shots
  );

  if (updatedCount > 0) {
    await boardRef.update(
      stripUndefined({
        productionDays: days,
        updatedAt: FieldValue.serverTimestamp(),
      })
    );
  }

  return {
    projectId,
    productionBoardId: board.id,
    updatedCount,
    plan,
  };
}

/**
 * Pull board Shoot Mode notes / done flags back onto the Content Plan shots.
 */
export async function syncShootProgressFromBoard(params: {
  db: Firestore;
  uid: string;
  planId: string;
}): Promise<{
  projectId: string;
  productionBoardId: string;
  updatedCount: number;
  plan: ContentPlan;
}> {
  const { plan, planRef, board, projectId } = await loadLinkedPlanAndBoard(params);
  const { shots, updatedCount } = applyBoardShootProgressToContentShots(
    board.productionDays || [],
    plan.shots || []
  );

  let nextPlan = plan;
  if (updatedCount > 0) {
    await planRef.update(
      stripUndefined({
        shots,
        updatedAt: FieldValue.serverTimestamp(),
      })
    );
    nextPlan = { ...plan, shots };
  }

  return {
    projectId,
    productionBoardId: board.id,
    updatedCount,
    plan: nextPlan,
  };
}
