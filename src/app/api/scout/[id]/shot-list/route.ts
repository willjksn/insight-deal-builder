import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { apiErrorStatus } from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { cineScoutGenerateShotList } from "@/lib/scout/cineScoutAi";
import { loadScoutGearContext } from "@/lib/scout/scoutAdminGear";
import { archiveScoutShotListManual, normalizeShotListItems } from "@/lib/scout/scoutHistory";
import { requireScoutProjectAccess } from "@/lib/scout/scoutRouteAuth";
import { ScoutDpPlan, ScoutShotList, ScoutShotListItem } from "@/lib/scout/types";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { project } = await requireScoutProjectAccess(request, id);

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");
    const ref = db.collection("shotScoutProjects").doc(id);
    if (!project.latestDpPlan) {
      return NextResponse.json({ error: "Generate DP plan first" }, { status: 400 });
    }

    if (project.latestShotList) {
      await archiveScoutShotListManual(
        db,
        id,
        project.latestShotList as ScoutShotList,
        "Before regenerate"
      );
    }

    const { gearProfile, gearList } = await loadScoutGearContext(project.userId, project);
    const listPayload = await cineScoutGenerateShotList(
      project,
      project.latestDpPlan as ScoutDpPlan,
      gearProfile,
      gearList
    );
    const listRef = await ref.collection("shotLists").add(
      stripUndefined({
        ...listPayload,
        source: "ai",
        label: "AI generated",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    const latestShotList = stripUndefined({
      ...listPayload,
      id: listRef.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await ref.update(
      stripUndefined({
        latestShotList,
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    return NextResponse.json({ ok: true, shotList: latestShotList });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Shot list failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { project } = await requireScoutProjectAccess(request, id);

    const body = (await request.json()) as { shots?: ScoutShotListItem[] };
    if (!body.shots || !Array.isArray(body.shots)) {
      return NextResponse.json({ error: "shots array is required" }, { status: 400 });
    }

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");
    const ref = db.collection("shotScoutProjects").doc(id);

    if (project.latestShotList) {
      await archiveScoutShotListManual(
        db,
        id,
        project.latestShotList as ScoutShotList,
        "Before manual edit"
      );
    }

    const normalized = normalizeShotListItems(body.shots);
    const listRef = await ref.collection("shotLists").add(
      stripUndefined({
        shots: normalized,
        source: "manual_edit",
        label: "Manual edit",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    const latestShotList = stripUndefined({
      id: listRef.id,
      shots: normalized,
      source: "manual_edit",
      label: "Manual edit",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await ref.update(
      stripUndefined({
        latestShotList,
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    const snap = await ref.get();
    return NextResponse.json({
      ok: true,
      shotList: latestShotList,
      project: { id: snap.id, ...snap.data() },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save shot list";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
