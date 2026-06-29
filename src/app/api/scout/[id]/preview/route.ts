import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { apiErrorStatus } from "@/lib/api/routeAuth";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { cineScoutGeneratePreviews } from "@/lib/scout/cineScoutAi";
import { loadScoutGearContext } from "@/lib/scout/scoutAdminGear";
import { requireScoutProjectAccess } from "@/lib/scout/scoutRouteAuth";
import { uploadScoutPreviewImage } from "@/lib/scout/previewStorage";
import { ScoutDpPlan, ScoutProject, ScoutProjectImage } from "@/lib/scout/types";

export const runtime = "nodejs";

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
    const { project } = await requireScoutProjectAccess(request, id);

    const db = getAdminDb();
    if (!db) throw new Error("Firebase Admin is not configured");
    const ref = db.collection("shotScoutProjects").doc(id);
    if (!project.latestDpPlan) {
      return NextResponse.json({ error: "Generate DP plan first" }, { status: 400 });
    }

    const images = await loadImages(id);
    const { gearProfile, gearList } = await loadScoutGearContext(project.userId, project);
    const previewPayloads = await cineScoutGeneratePreviews(
      project,
      project.latestDpPlan as ScoutDpPlan,
      images,
      project.latestShotList,
      gearProfile,
      gearList
    );

    const saved = [];
    const warnings: string[] = [];
    for (const p of previewPayloads) {
      let imageUrl: string | undefined;
      if (p.imageBuffer) {
        imageUrl = await uploadScoutPreviewImage(
          project.userId,
          id,
          p.id,
          p.imageBuffer,
          p.imageContentType ?? "image/png"
        );
      } else if (p.imageGenerationError) {
        warnings.push(`${p.shotLabel ?? p.type}: ${p.imageGenerationError}`);
      }
      const { imageBuffer: _buf, imageContentType: _ct, ...rest } = p;
      const clean = stripUndefined({ ...rest, imageUrl });
      const docRef = await ref.collection("previews").add(
        stripUndefined({
          ...clean,
          createdAt: FieldValue.serverTimestamp(),
        })
      );
      saved.push(stripUndefined({ ...clean, id: docRef.id, createdAt: new Date().toISOString() }));
    }

    await ref.update(
      stripUndefined({
        status: "previs_ready",
        latestPreviews: saved,
        updatedAt: FieldValue.serverTimestamp(),
      })
    );

    return NextResponse.json({ ok: true, previews: saved, warnings });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Preview failed";
    return NextResponse.json({ error: message }, { status: apiErrorStatus(message) });
  }
}
