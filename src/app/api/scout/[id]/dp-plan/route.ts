import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { apiErrorStatus } from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { cineScoutGenerateDpPlan } from "@/lib/scout/cineScoutAi";
import { loadScoutGearContext } from "@/lib/scout/scoutAdminGear";
import { requireScoutProjectAccess } from "@/lib/scout/scoutRouteAuth";
import { ScoutLocationAnalysis, LightFixture } from "@/lib/scout/types";
import { WINDOW_DAYLIGHT_FIXTURE, WINDOW_DAYLIGHT_ID } from "@/lib/scout/mockFixtures";

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
    if (!project.latestAnalysis) {
      return NextResponse.json({ error: "Run location analysis first" }, { status: 400 });
    }

    const fixtureSnap = await db
      .collection("users")
      .doc(project.userId)
      .collection("lightFixtures")
      .get();
    const allFixtures = fixtureSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as LightFixture);
    const selectedIds = project.selectedLightFixtureIds ?? [];
    let fixtures = selectedIds.length
      ? allFixtures.filter((f) => selectedIds.includes(f.id))
      : allFixtures.slice(0, 3);
    if (selectedIds.includes(WINDOW_DAYLIGHT_ID)) {
      fixtures = [...fixtures, WINDOW_DAYLIGHT_FIXTURE];
    }

    const { gearProfile, gearList } = await loadScoutGearContext(project.userId, project);
    const dpPayload = await cineScoutGenerateDpPlan(
      project,
      project.latestAnalysis as ScoutLocationAnalysis,
      fixtures,
      gearProfile,
      gearList
    );
    const dpRef = await ref.collection("dpPlans").add(
      stripUndefined({
        ...dpPayload,
        source: "ai",
        label: "AI DP plan",
        createdAt: FieldValue.serverTimestamp(),
      })
    );

    const latestDpPlan = stripUndefined({
      ...dpPayload,
      id: dpRef.id,
      createdAt: new Date().toISOString(),
    });

    await ref.update(
      stripUndefined({
        status: "ready_to_shoot",
        latestDpPlan,
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    return NextResponse.json({ ok: true, dpPlan: latestDpPlan });
  } catch (err) {
    const message = err instanceof Error ? err.message : "DP plan failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
