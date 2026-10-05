import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { stripUndefined } from "@/lib/firebase/firestore";
import { PRODUCTION_BOARDS_COLLECTION } from "@/lib/firebase/productionFirestore";
import { createProductionBoardFromProject } from "@/lib/production/defaults";
import { mergeSceneShotsIntoDays, refreshLinkedShots } from "@/lib/production/sceneBuilderHandoff";
import type { ProductionBoard, ProductionDay } from "@/lib/production/types";
import { SCENE_OUTPUT_LABELS, type ShootGuide } from "@/lib/shootGuide/types";
import type { Project } from "@/lib/types";

export async function sendSceneToProduction(params: {
  uid: string;
  guideId: string;
  shotIds: string[];
  mode: "new" | "existing";
  projectName?: string;
  projectId?: string;
}): Promise<{ projectId: string; dayId: string; created: number; updated: number }> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  const guideSnap = await db.collection("shootGuides").doc(params.guideId).get();
  if (!guideSnap.exists) throw new Error("Not found");
  const guide = { id: guideSnap.id, ...guideSnap.data() } as ShootGuide;
  if (guide.userId !== params.uid) throw new Error("Forbidden");

  const selected = (guide.shots ?? []).filter((shot) => params.shotIds.includes(shot.id));
  if (!selected.length) throw new Error("Select at least one shot");

  let projectId = params.projectId?.trim() || "";
  let createdProject = false;
  if (params.mode === "new") {
    const projectName = params.projectName?.trim() || guide.title || "Untitled scene";
    const location = guide.sceneAnalysis?.environment || guide.locationAnalysis?.layout || "";
    const ref = await db.collection("projects").add(
      stripUndefined({
        projectName,
        clientId: "",
        clientName: "",
        agreementType: "client_project",
        projectType: "Business Brand Package",
        shootType: "Photo + Video",
        totalProjectFee: 0,
        shootDate: "",
        deliveryDate: "",
        location,
        status: "draft",
        ownerUserId: params.uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    );
    projectId = ref.id;
    createdProject = true;
  }
  if (!projectId) throw new Error("Choose a Production project");

  const projectSnap = await db.collection("projects").doc(projectId).get();
  if (!projectSnap.exists) throw new Error("Project not found");
  const project = { id: projectSnap.id, ...projectSnap.data() } as Project;
  if (project.ownerUserId !== params.uid) throw new Error("Forbidden");

  const boardQuery = await db.collection(PRODUCTION_BOARDS_COLLECTION).where("projectId", "==", projectId).limit(1).get();
  let boardId = "";
  let days: ProductionDay[] = [];
  let boardData: Partial<ProductionBoard> = {};
  if (boardQuery.empty) {
    const seeded = createProductionBoardFromProject(project, params.uid);
    if (createdProject) {
      seeded.filmTitle = guide.title || project.projectName;
      seeded.logline = guide.prompt || "";
      seeded.lookAndFeel = [guide.outputType ? SCENE_OUTPUT_LABELS[guide.outputType] : "", guide.creativeIntent]
        .filter(Boolean)
        .join(" · ");
      seeded.filmingNotes = guide.notes?.map((note) => note.body).filter(Boolean).join("\n") || "";
      seeded.inspirationImages = (guide.references ?? [])
        .filter((ref) => ref.storageUrl)
        .map((ref, index) => ({
          id: ref.id,
          imageUrl: ref.storageUrl,
          storagePath: ref.storagePath,
          caption: ref.kind,
          sortOrder: index,
        }));
      if (guide.sceneAnalysis?.subject) {
        seeded.people = [
          {
            id: crypto.randomUUID(),
            group: "cast",
            name: guide.sceneAnalysis.subject,
            role: "Subject",
            sortOrder: 0,
          },
        ];
      }
    }
    const ref = await db.collection(PRODUCTION_BOARDS_COLLECTION).add(
      stripUndefined({
        ...seeded,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    );
    boardId = ref.id;
    days = seeded.productionDays;
    boardData = seeded;
  } else {
    boardId = boardQuery.docs[0].id;
    boardData = boardQuery.docs[0].data() as Partial<ProductionBoard>;
    days = (boardData.productionDays ?? []) as ProductionDay[];
  }

  const merged = mergeSceneShotsIntoDays(days, guide, selected);
  await db.collection(PRODUCTION_BOARDS_COLLECTION).doc(boardId).set(
    stripUndefined({
      ...boardData,
      productionDays: merged.days,
      updatedAt: FieldValue.serverTimestamp(),
    }),
    { merge: true }
  );

  return { projectId, dayId: merged.dayId, created: merged.created, updated: merged.updated };
}

function timeMillis(value: unknown): number | null {
  if (!value) return null;
  if (typeof value === "string" || typeof value === "number") {
    const n = new Date(value).getTime();
    return Number.isFinite(n) ? n : null;
  }
  if (typeof value === "object" && value && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  if (typeof value === "object" && value && "_seconds" in value) {
    return Number((value as { _seconds: number })._seconds) * 1000;
  }
  return null;
}

async function loadOwnedGuides(uid: string, sceneIds: string[]): Promise<ShootGuide[]> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  const guides: ShootGuide[] = [];
  for (const sceneId of sceneIds) {
    const snap = await db.collection("shootGuides").doc(sceneId).get();
    if (!snap.exists) continue;
    const guide = { id: snap.id, ...snap.data() } as ShootGuide;
    if (guide.userId !== uid) continue;
    guides.push(guide);
  }
  return guides;
}

export async function updateProductionFromScene(params: {
  uid: string;
  projectId: string;
  productionShotId?: string;
}): Promise<{ updated: string[]; current: string[]; missing: string[]; failed: { id: string; error: string }[] }> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  const projectSnap = await db.collection("projects").doc(params.projectId).get();
  if (!projectSnap.exists) throw new Error("Project not found");
  const project = projectSnap.data() as { ownerUserId?: string };
  if (project.ownerUserId !== params.uid) throw new Error("Forbidden");
  const boardQuery = await db.collection(PRODUCTION_BOARDS_COLLECTION).where("projectId", "==", params.projectId).limit(1).get();
  if (boardQuery.empty) throw new Error("Production board not found");
  const board = boardQuery.docs[0];
  const days = (board.data().productionDays ?? []) as ProductionDay[];
  const sceneIds = [
    ...new Set(
      days.flatMap((day) =>
        (day.shots ?? [])
          .filter((shot) => shot.sourceSceneId && (!params.productionShotId || shot.id === params.productionShotId))
          .map((shot) => shot.sourceSceneId as string)
      )
    ),
  ];
  const guides = await loadOwnedGuides(params.uid, sceneIds);
  const refreshed = refreshLinkedShots(days, guides, { productionShotId: params.productionShotId });
  await board.ref.set(
    stripUndefined({ productionDays: refreshed.days, updatedAt: FieldValue.serverTimestamp() }),
    { merge: true }
  );
  return {
    updated: refreshed.updated,
    current: refreshed.current,
    missing: refreshed.missing,
    failed: refreshed.failed,
  };
}

export async function sceneSyncStatus(params: {
  uid: string;
  projectId: string;
}): Promise<{ shots: { id: string; state: "recent" | "current" | "available" | "missing" }[] }> {
  const db = getAdminDb();
  if (!db) throw new Error("Firebase Admin is not configured");
  const projectSnap = await db.collection("projects").doc(params.projectId).get();
  if (!projectSnap.exists) throw new Error("Project not found");
  if ((projectSnap.data() as { ownerUserId?: string }).ownerUserId !== params.uid) throw new Error("Forbidden");
  const boardQuery = await db.collection(PRODUCTION_BOARDS_COLLECTION).where("projectId", "==", params.projectId).limit(1).get();
  if (boardQuery.empty) return { shots: [] };
  const days = (boardQuery.docs[0].data().productionDays ?? []) as ProductionDay[];
  const linked = days.flatMap((day) => day.shots ?? []).filter((shot) => shot.sourceSceneId && shot.sourceShotId);
  const guides = await loadOwnedGuides(params.uid, [...new Set(linked.map((shot) => shot.sourceSceneId as string))]);
  const byId = new Map(guides.map((guide) => [guide.id, guide]));
  const now = Date.now();
  return {
    shots: linked.map((shot) => {
      const guide = byId.get(shot.sourceSceneId as string);
      const source = guide?.shots?.find((item) => item.id === shot.sourceShotId);
      if (shot.sourceUnavailable || !guide || !source) return { id: shot.id, state: "missing" as const };
      const sceneTime = timeMillis((guide as { updatedAt?: unknown }).updatedAt);
      const synced = timeMillis(shot.sourceSyncedAt);
      if (sceneTime && synced && sceneTime > synced + 1000) return { id: shot.id, state: "available" as const };
      if (synced && now - synced < 24 * 60 * 60 * 1000) return { id: shot.id, state: "recent" as const };
      return { id: shot.id, state: "current" as const };
    }),
  };
}
