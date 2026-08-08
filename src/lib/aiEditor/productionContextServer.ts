import { getAdminDb } from "@/lib/firebase/admin";
import { buildProductionContext } from "@/lib/aiEditor/productionContext";
import type { ProductionContext } from "@/lib/aiEditor/types";
import { PRODUCTION_BOARDS_COLLECTION } from "@/lib/firebase/productionFirestore";
import { serializeDoc } from "@/lib/revenueOpportunities/server/serialize";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";
import type { ProductionBoard } from "@/lib/production/types";
import type { ScriptWriterSession } from "@/lib/scriptWriter/types";
import type { Project } from "@/lib/types";

export async function loadProductionContext(projectId: string): Promise<ProductionContext> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");

  const projectSnap = await db.collection("projects").doc(projectId).get();
  if (!projectSnap.exists) throw new Error("Project not found");
  const project = serializeDoc<Project>(projectSnap.id, projectSnap.data()!);

  const boardSnap = await db
    .collection(PRODUCTION_BOARDS_COLLECTION)
    .where("projectId", "==", projectId)
    .limit(1)
    .get();
  const board = boardSnap.empty
    ? null
    : serializeDoc<ProductionBoard>(boardSnap.docs[0].id, boardSnap.docs[0].data());

  let scriptSession: ScriptWriterSession | null = null;
  const sessionId = board?.scriptSessionId;
  if (sessionId) {
    const s = await db.collection(SCRIPT_WRITER_SESSIONS_COLLECTION).doc(sessionId).get();
    if (s.exists) scriptSession = serializeDoc<ScriptWriterSession>(s.id, s.data()!);
  }
  if (!scriptSession) {
    const linked = await db
      .collection(SCRIPT_WRITER_SESSIONS_COLLECTION)
      .where("linkedProjectId", "==", projectId)
      .limit(5)
      .get();
    if (!linked.empty) {
      scriptSession = serializeDoc<ScriptWriterSession>(
        linked.docs[0].id,
        linked.docs[0].data()
      );
    }
  }

  return buildProductionContext({ project, board, scriptSession });
}
