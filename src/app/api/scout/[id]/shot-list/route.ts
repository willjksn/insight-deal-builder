import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { apiErrorStatus, assertCanUseShotScout, requireAuthUser } from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { cineScoutGenerateShotList } from "@/lib/scout/cineScoutAi";
import { loadScoutGearContext } from "@/lib/scout/scoutAdminGear";
import { ScoutDpPlan, ScoutProject } from "@/lib/scout/types";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { uid, appUser } = await requireAuthUser(request);
    assertCanUseShotScout(appUser);

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");
    const ref = db.collection("shotScoutProjects").doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new Error("Scout session not found");
    const project = { id: snap.id, ...snap.data() } as ScoutProject;
    if (project.userId !== uid) throw new Error("Not authorized");
    if (!project.latestDpPlan) {
      return NextResponse.json({ error: "Generate DP plan first" }, { status: 400 });
    }

    const { gearProfile, gearList } = await loadScoutGearContext(uid, project);
    const listPayload = await cineScoutGenerateShotList(
      project,
      project.latestDpPlan as ScoutDpPlan,
      gearProfile,
      gearList
    );
    const listRef = await ref.collection("shotLists").add(
      stripUndefined({
        ...listPayload,
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
