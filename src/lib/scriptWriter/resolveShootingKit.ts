import { Firestore } from "firebase-admin/firestore";
import {
  normalizeShootingKit,
  ProductionShootingKit,
  shootingKitFromLegacy,
  shootingKitHasGear,
} from "@/lib/production/shootingKit";
import { ProductionBoard } from "@/lib/production/types";
import { PRODUCTION_BOARDS_COLLECTION } from "@/lib/firebase/productionFirestore";
import { ScriptWriterSession } from "@/lib/scriptWriter/types";

export function mergeSessionAndBoardKit(
  session: Pick<ScriptWriterSession, "shootingKit">,
  board?: Pick<ProductionBoard, "shootingKit" | "gearItems"> | null
): ProductionShootingKit {
  const sessionKit = normalizeShootingKit(session.shootingKit);
  if (shootingKitHasGear(sessionKit)) return sessionKit;
  if (board) return shootingKitFromLegacy(board.shootingKit, board.gearItems ?? []);
  return sessionKit;
}

export async function loadProductionBoardForProject(
  db: Firestore,
  projectId: string
): Promise<ProductionBoard | null> {
  const q = await db
    .collection(PRODUCTION_BOARDS_COLLECTION)
    .where("projectId", "==", projectId)
    .limit(1)
    .get();
  if (q.empty) return null;
  return q.docs[0].data() as ProductionBoard;
}

export async function resolveShootingKitForSession(
  db: Firestore,
  session: ScriptWriterSession
): Promise<ProductionShootingKit> {
  const sessionKit = normalizeShootingKit(session.shootingKit);
  if (shootingKitHasGear(sessionKit)) return sessionKit;
  const projectId = session.linkedProjectId ?? session.appliedProjectId;
  if (!projectId) return sessionKit;
  const board = await loadProductionBoardForProject(db, projectId);
  return mergeSessionAndBoardKit(session, board);
}
