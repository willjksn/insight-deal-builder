import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { apiErrorStatus } from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import {
  archiveScoutShotListManual,
  listScoutHistory,
  loadScoutHistoryDocument,
  normalizeShotListItems,
  ScoutHistoryKind,
} from "@/lib/scout/scoutHistory";
import { requireScoutProjectAccess } from "@/lib/scout/scoutRouteAuth";
import { ScoutShotList, ScoutShotListItem } from "@/lib/scout/types";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await requireScoutProjectAccess(request, id);

    const kind = request.nextUrl.searchParams.get("kind") as ScoutHistoryKind | null;
    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");

    if (kind) {
      const entries = await listScoutHistory(db, id, kind);
      return NextResponse.json({ entries });
    }

    const [shotLists, dpPlans, analysis] = await Promise.all([
      listScoutHistory(db, id, "shotLists"),
      listScoutHistory(db, id, "dpPlans"),
      listScoutHistory(db, id, "analysis"),
    ]);

    return NextResponse.json({ shotLists, dpPlans, analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load history";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { project } = await requireScoutProjectAccess(request, id);

    const body = (await request.json()) as {
      kind?: ScoutHistoryKind;
      documentId?: string;
    };
    if (!body.kind || !body.documentId) {
      return NextResponse.json({ error: "kind and documentId are required" }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");
    const ref = db.collection("shotScoutProjects").doc(id);

    const doc = await loadScoutHistoryDocument(db, id, body.kind, body.documentId);
    if (!doc) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

    if (body.kind === "shotLists") {
      if (project.latestShotList) {
        await archiveScoutShotListManual(
          db,
          id,
          project.latestShotList as ScoutShotList,
          "Before restore"
        );
      }
      const shots = doc.shots as ScoutShotListItem[];
      const latestShotList = stripUndefined({
        id: body.documentId,
        shots,
        source: "restore",
        label: "Restored shot list",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      update.latestShotList = latestShotList;
    } else if (body.kind === "dpPlans") {
      const { id: docId, createdAt, ...dpPayload } = doc;
      update.latestDpPlan = stripUndefined({
        ...dpPayload,
        id: docId as string,
        createdAt: new Date().toISOString(),
      });
      update.status = "ready_to_shoot";
    } else if (body.kind === "analysis") {
      const { id: docId, createdAt, ...analysisPayload } = doc;
      update.latestAnalysis = stripUndefined({
        ...analysisPayload,
        id: docId as string,
        createdAt: new Date().toISOString(),
      });
    }

    await ref.update(stripUndefined(update));

    const snap = await ref.get();
    return NextResponse.json({ ok: true, project: { id: snap.id, ...snap.data() } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to restore version";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
