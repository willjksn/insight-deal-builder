import { FieldValue, Firestore } from "firebase-admin/firestore";
import { Project } from "@/lib/types";
import { ProductionBoard } from "@/lib/production/types";
import { createProductionBoardFromProject } from "@/lib/production/defaults";
import { PRODUCTION_BOARDS_COLLECTION } from "@/lib/firebase/productionFirestore";
import { stripUndefined } from "@/lib/firebase/firestore";
import { ScoutShotList } from "@/lib/scout/types";
import {
  castFromScript,
  filmingNotesFromScript,
  inspirationImagesFromSession,
  locationsFromInspirationImages,
  locationsFromScript,
  productionSceneFramesFromScript,
  productionShotsFromScript,
  sceneNumbersFromScript,
  scoutShotsFromScript,
} from "@/lib/scriptWriter/scriptMappers";
import { ScriptDocument, ScriptWriterSession } from "@/lib/scriptWriter/types";
import { SCRIPT_WRITER_SESSIONS_COLLECTION } from "@/lib/scriptWriter/apiClient";

export function serializeScriptSession(
  id: string,
  data: Record<string, unknown>
): ScriptWriterSession {
  return {
    id,
    ...(data as Omit<ScriptWriterSession, "id">),
  };
}

export { getScriptSessionForUser } from "@/lib/projectAccess/server";

async function getBoardForProject(
  db: Firestore,
  projectId: string
): Promise<(ProductionBoard & { id: string }) | null> {
  const q = await db
    .collection(PRODUCTION_BOARDS_COLLECTION)
    .where("projectId", "==", projectId)
    .limit(1)
    .get();
  if (q.empty) return null;
  const docSnap = q.docs[0];
  return { ...(docSnap.data() as ProductionBoard), id: docSnap.id };
}

export async function applyScriptToProject(params: {
  db: Firestore;
  uid: string;
  session: ScriptWriterSession & { id: string };
  script: ScriptDocument;
  projectId: string;
  createScout: boolean;
  updateExistingScout: boolean;
}): Promise<{ productionBoardId: string; scoutProjectId?: string }> {
  const { db, uid, session, script, projectId, createScout, updateExistingScout } = params;

  const projectSnap = await db.collection("projects").doc(projectId).get();
  if (!projectSnap.exists) throw new Error("Project not found");
  const project = { id: projectSnap.id, ...projectSnap.data() } as Project;

  let board = await getBoardForProject(db, projectId);
  if (!board) {
    const payload = stripUndefined({
      ...createProductionBoardFromProject(project, uid),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const ref = await db.collection(PRODUCTION_BOARDS_COLLECTION).add(payload);
    board = { ...(payload as unknown as ProductionBoard), id: ref.id };
  }

  const newCast = castFromScript(script);
  const existingCastIds = new Set(
    board.people.filter((p) => p.group === "cast").map((p) => p.name.toLowerCase())
  );
  const mergedPeople = [
    ...board.people,
    ...newCast.filter((p) => !existingCastIds.has(p.name.toLowerCase())),
  ];

  const newLocations = locationsFromScript(script);
  const inspirationLocations = locationsFromInspirationImages(session.inspirationImages ?? []);
  const locSet = new Set(board.locations.map((l) => l.name.toLowerCase()));
  const mergedLocations = [...board.locations];
  for (const loc of [...newLocations, ...inspirationLocations]) {
    const key = loc.name.toLowerCase();
    if (locSet.has(key)) continue;
    locSet.add(key);
    mergedLocations.push(loc);
  }

  const dayOne = board.productionDays[0];
  const sessionImages = session.inspirationImages ?? [];
  const mergedInspiration = inspirationImagesFromSession(sessionImages, board.inspirationImages);
  const sceneFrames =
    session.storyboardMode || script.storyboardFrames?.length
      ? productionSceneFramesFromScript(script, sessionImages, mergedInspiration)
      : dayOne?.sceneFrames ?? [];

  const updatedDays = board.productionDays.length
    ? board.productionDays.map((day, index) =>
        index === 0
          ? {
              ...day,
              title: script.title || day.title,
              scenes: sceneNumbersFromScript(script),
              shots: productionShotsFromScript(script),
              sceneFrames,
            }
          : day
      )
    : board.productionDays;

  const notesPrefix = filmingNotesFromScript(script);
  const filmingNotes = board.filmingNotes?.trim()
    ? `${board.filmingNotes.trim()}\n\n— From script writer\n${notesPrefix}`
    : notesPrefix;

  const scoutShots = scoutShotsFromScript(script);
  const latestShotList: Omit<ScoutShotList, "createdAt" | "updatedAt"> & {
    createdAt: string;
    updatedAt: string;
  } = {
    id: crypto.randomUUID(),
    shots: scoutShots,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  let scoutProjectId = session.linkedScoutProjectId ?? session.appliedScoutProjectId;

  if (scoutProjectId && updateExistingScout) {
    const scoutRef = db.collection("shotScoutProjects").doc(scoutProjectId);
    const scoutSnap = await scoutRef.get();
    if (scoutSnap.exists && scoutSnap.data()?.userId === uid) {
      await scoutRef.update(
        stripUndefined({
          sceneIdea: script.logline || script.fountain.slice(0, 500),
          projectName: script.title,
          theme: script.lookAndFeel ?? scoutSnap.data()?.theme,
          latestShotList,
          linkedProjectId: projectId,
          linkedProjectName: project.projectName,
          updatedAt: FieldValue.serverTimestamp(),
        })
      );
    }
  } else if (createScout) {
    const scoutRef = await db.collection("shotScoutProjects").add(
      stripUndefined({
        userId: uid,
        projectName: script.title,
        sceneIdea: script.logline || script.fountain.slice(0, 800),
        sceneType: "short_film",
        mood: "cinematic",
        theme: script.lookAndFeel ?? "",
        platform: "youtube",
        aspectRatio: "16:9",
        skillLevel: "intermediate",
        preferredLook: "s_log3",
        appMode: "pro",
        status: "needs_images",
        linkedProjectId: projectId,
        linkedProjectName: project.projectName,
        latestShotList,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    );
    scoutProjectId = scoutRef.id;
  }

  const linkedScoutIds = [...(board.linkedScoutProjectIds ?? [])];
  if (scoutProjectId && !linkedScoutIds.includes(scoutProjectId)) {
    linkedScoutIds.push(scoutProjectId);
  }

  await db.collection(PRODUCTION_BOARDS_COLLECTION).doc(board.id).update(
    stripUndefined({
      filmTitle: script.title,
      logline: script.logline,
      idealRuntime: script.idealRuntime ?? board.idealRuntime,
      lookAndFeel: script.lookAndFeel ?? board.lookAndFeel,
      references: script.references ?? board.references,
      filmingNotes,
      people: mergedPeople,
      locations: mergedLocations,
      inspirationImages: mergedInspiration,
      productionDays: updatedDays,
      scriptSessionId: session.id,
      scriptFountain: script.fountain,
      linkedScoutProjectIds: linkedScoutIds,
      updatedAt: FieldValue.serverTimestamp(),
    })
  );

  await db.collection(SCRIPT_WRITER_SESSIONS_COLLECTION).doc(session.id).update(
    stripUndefined({
      status: "applied",
      appliedProjectId: projectId,
      appliedScoutProjectId: scoutProjectId,
      linkedProjectId: projectId,
      linkedScoutProjectId: scoutProjectId ?? session.linkedScoutProjectId,
      updatedAt: FieldValue.serverTimestamp(),
    })
  );

  return { productionBoardId: board.id, scoutProjectId };
}
