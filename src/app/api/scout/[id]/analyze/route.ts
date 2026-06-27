import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { apiErrorStatus, assertCanUseShotScout, requireAuthUser } from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { cineScoutAnalyzeLocation } from "@/lib/scout/cineScoutAi";
import { ScoutProject, ScoutProjectImage } from "@/lib/scout/types";

export const runtime = "nodejs";

async function loadScoutProject(scoutId: string, uid: string) {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  const ref = db.collection("shotScoutProjects").doc(scoutId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Scout session not found");
  const data = snap.data()!;
  if (data.userId !== uid) throw new Error("Not authorized");
  return { ref, data };
}

async function loadImages(scoutId: string): Promise<ScoutProjectImage[]> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  const snap = await db
    .collection("shotScoutProjects")
    .doc(scoutId)
    .collection("images")
    .orderBy("createdAt", "asc")
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ScoutProjectImage);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { uid, appUser } = await requireAuthUser(request);
    assertCanUseShotScout(appUser);

    const { ref, data } = await loadScoutProject(id, uid);
    const images = await loadImages(id);
    if (images.length < 1) {
      return NextResponse.json({ error: "Upload at least one location photo first" }, { status: 400 });
    }

    const project = { id, ...data } as ScoutProject;
    const analysisPayload = await cineScoutAnalyzeLocation(project, images);
    const analysisRef = await ref.collection("analysis").add(
      stripUndefined({
        ...analysisPayload,
        createdAt: FieldValue.serverTimestamp(),
      })
    );

    const bestImage = images.find((img) => img.id === analysisPayload.bestAngle.bestImageId) ?? images[0];
    const perImageById = new Map(analysisPayload.perImage.map((p) => [p.imageId, p]));

    for (const img of images) {
      const scored = perImageById.get(img.id);
      await ref
        .collection("images")
        .doc(img.id)
        .update(
          stripUndefined({
            aiScore: scored?.score ?? null,
            strengths: scored?.strengths ?? [],
            weaknesses: scored?.weaknesses ?? [],
            selectedAsBest: img.id === bestImage.id,
          })
        );
    }

    const latestAnalysis = stripUndefined({
      ...analysisPayload,
      id: analysisRef.id,
      createdAt: new Date().toISOString(),
    });

    await ref.update(
      stripUndefined({
        status: analysisPayload.missingQuestions?.length ? "needs_questions" : "ready_to_plan",
        bestImageId: bestImage.id,
        bestImageUrl: bestImage.storageUrl,
        thumbnailUrl: bestImage.storageUrl,
        latestAnalysis,
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    return NextResponse.json({ ok: true, analysis: latestAnalysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
