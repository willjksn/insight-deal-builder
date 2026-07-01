import type { Firestore } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorStatus,
  assertCanUseShotScout,
  requireApprovedAuthUser,
} from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { generateCrewPacket } from "@/lib/production/crewPacketAi";
import { ProductionBoard } from "@/lib/production/types";
import { getScriptSessionForUser } from "@/lib/projectAccess/server";
import { ScriptDocument } from "@/lib/scriptWriter/types";
import { Project } from "@/lib/types";

export const runtime = "nodejs";

const PRODUCTION_BOARDS_COLLECTION = "productionBoards";

async function loadBoard(db: Firestore, projectId: string): Promise<ProductionBoard | null> {
  const snap = await db
    .collection(PRODUCTION_BOARDS_COLLECTION)
    .where("projectId", "==", projectId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as ProductionBoard;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { uid, appUser } = await requireApprovedAuthUser(request);
    assertCanUseShotScout(appUser);
    const { id: projectId } = await params;

    const body = (await request.json()) as { dayId?: string; scriptSessionId?: string };
    const dayId = body.dayId?.trim();
    if (!dayId) {
      return NextResponse.json({ error: "dayId is required" }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    const board = await loadBoard(db, projectId);
    if (!board) {
      return NextResponse.json({ error: "Production board not found" }, { status: 404 });
    }

    const day = board.productionDays.find((d) => d.id === dayId);
    if (!day) {
      return NextResponse.json({ error: "Shoot day not found" }, { status: 404 });
    }

    const projectSnap = await db.collection("projects").doc(projectId).get();
    const project = projectSnap.exists
      ? ({ id: projectSnap.id, ...projectSnap.data() } as Project)
      : null;
    const projectName = project?.projectName ?? board.filmTitle ?? "Production";

    let script: ScriptDocument | null = null;
    const sessionId = body.scriptSessionId?.trim() || board.scriptSessionId;
    if (sessionId) {
      const session = await getScriptSessionForUser(db, sessionId, uid, appUser);
      if (session?.script) {
        script = session.script as ScriptDocument;
      }
    }

    const packet = await generateCrewPacket({
      board,
      day,
      script,
      projectName,
    });

    return NextResponse.json({ packet });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate crew packet";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
