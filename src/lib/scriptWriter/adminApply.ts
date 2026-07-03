import { FieldValue, Firestore } from "firebase-admin/firestore";
import { Project } from "@/lib/types";
import { ProductionBoard } from "@/lib/production/types";
import { createProductionBoardFromProject, createEmptyProductionDay } from "@/lib/production/defaults";
import { PRODUCTION_BOARDS_COLLECTION } from "@/lib/firebase/productionFirestore";
import { stripUndefined } from "@/lib/firebase/firestore";
import {
  castFromScript,
  filmingNotesFromScript,
  inspirationImagesFromSession,
  locationsFromInspirationImages,
  locationsFromScript,
  mergeProductionSceneFramesFromScript,
  productionSceneFramesFromScript,
  productionShotsFromScript,
  sceneNumbersFromScript,
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
}): Promise<{ productionBoardId: string }> {
  const { db, uid, session, script, projectId } = params;

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
    board = {
      ...(payload as unknown as ProductionBoard),
      id: ref.id,
      people: [],
      locations: [],
      productionDays: [createEmptyProductionDay(1)],
      inspirationImages: [],
    };
  }

  const boardPeople = board.people ?? [];
  const boardLocations = board.locations ?? [];
  const boardDays = board.productionDays?.length
    ? board.productionDays
    : [createEmptyProductionDay(1)];
  const boardInspiration = board.inspirationImages ?? [];

  const newCast = castFromScript(script);
  const existingCastIds = new Set(
    boardPeople.filter((p) => p.group === "cast").map((p) => p.name.toLowerCase())
  );
  const mergedPeople = [
    ...boardPeople,
    ...newCast.filter((p) => !existingCastIds.has(p.name.toLowerCase())),
  ];

  const newLocations = locationsFromScript(script);
  const inspirationLocations = locationsFromInspirationImages(session.inspirationImages ?? []);
  const locSet = new Set(boardLocations.map((l) => l.name.toLowerCase()));
  const mergedLocations = [...boardLocations];
  for (const loc of [...newLocations, ...inspirationLocations]) {
    const key = loc.name.toLowerCase();
    if (locSet.has(key)) continue;
    locSet.add(key);
    mergedLocations.push(loc);
  }

  const dayOne = boardDays[0];
  const sessionImages = session.inspirationImages ?? [];
  const mergedInspiration = inspirationImagesFromSession(sessionImages, boardInspiration);
  const existingSceneFrames = dayOne?.sceneFrames ?? [];
  const sceneFrames = script.scenes?.length
    ? existingSceneFrames.length
      ? mergeProductionSceneFramesFromScript(
          existingSceneFrames,
          script,
          sessionImages,
          mergedInspiration
        )
      : productionSceneFramesFromScript(script, sessionImages, mergedInspiration)
    : existingSceneFrames;

  const updatedDays = boardDays.length
    ? boardDays.map((day, index) =>
        index === 0
          ? stripUndefined({
              ...day,
              title: script.title || day.title,
              scenes: sceneNumbersFromScript(script),
              shots: productionShotsFromScript(script),
              sceneFrames,
            })
          : day
      )
    : boardDays;

  const notesPrefix = filmingNotesFromScript(script);
  const filmingNotes = board.filmingNotes?.trim()
    ? `${board.filmingNotes.trim()}\n\n— From script writer\n${notesPrefix}`
    : notesPrefix;

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
      scriptFountain: script.fountain ?? "",
      updatedAt: FieldValue.serverTimestamp(),
    })
  );

  await db.collection(SCRIPT_WRITER_SESSIONS_COLLECTION).doc(session.id).update(
    stripUndefined({
      status: "applied",
      appliedProjectId: projectId,
      linkedProjectId: projectId,
      updatedAt: FieldValue.serverTimestamp(),
    })
  );

  return { productionBoardId: board.id };
}
