import type { Project } from "@/lib/types";
import type { ProductionBoard } from "@/lib/production/types";
import type { ScriptDocument, ScriptWriterSession } from "@/lib/scriptWriter/types";
import type {
  ProductionContext,
  ProductionContextScene,
  ProductionContextShot,
} from "@/lib/aiEditor/types";

function scenesFromScript(script: ScriptDocument | null | undefined): ProductionContextScene[] {
  if (!script?.scenes?.length) return [];
  return script.scenes.map((s) => ({
    sceneNumber: s.sceneNumber,
    heading: s.heading,
    summary: (s.action || "").trim().slice(0, 240) || undefined,
    characters: [
      ...new Set(
        (s.dialogue ?? [])
          .map((d) => d.character?.trim())
          .filter((c): c is string => Boolean(c))
      ),
    ],
  }));
}

function charactersFromScript(script: ScriptDocument | null | undefined): string[] {
  const names = new Set<string>();
  for (const s of script?.scenes ?? []) {
    for (const d of s.dialogue ?? []) {
      if (d.character?.trim()) names.add(d.character.trim());
    }
  }
  for (const c of script?.characters ?? []) {
    if (c?.name?.trim()) names.add(c.name.trim());
  }
  return [...names];
}

/**
 * Pure builder — no I/O. Used by server loader and unit tests.
 */
export function buildProductionContext(input: {
  project: Project;
  board: ProductionBoard | null;
  scriptSession: ScriptWriterSession | null;
}): ProductionContext {
  const { project, board, scriptSession } = input;
  const script = (scriptSession?.script as ScriptDocument | null) ?? null;
  const shots: ProductionContextShot[] = [];
  for (const day of board?.productionDays ?? []) {
    for (const shot of day.shots ?? []) {
      shots.push({
        id: shot.id,
        dayId: day.id,
        scene: shot.sceneRef || shot.sceneHeading,
        shotName: shot.shotName || shot.label,
        shotType: shot.shotType || shot.framing,
        camera: shot.cameraBody,
        lens: shot.lens,
        movement: shot.cameraMovement,
        description: [shot.description, shot.subjectAction, shot.notes, shot.editNote]
          .filter(Boolean)
          .join(" · ") || undefined,
        scoutShotNumber: shot.scoutShotNumber,
        contentPlanShotId: shot.contentPlanShotId,
        subjectAction: shot.subjectAction,
        editNote: shot.editNote,
        hasFrame: Boolean(shot.referenceImageUrl),
      });
    }
  }

  const framedShotCount = shots.filter((s) => s.hasFrame).length;
  const notes: string[] = [];
  if (project.aiEditorOnly) {
    notes.push("Footage-only edit — no ShootSpine production plan required");
  }
  if (board?.scriptSessionId) notes.push("Prep board linked to a script session");
  if (shots.length) notes.push(`${shots.length} coverage shots on board`);

  return {
    projectId: project.id,
    projectName: project.projectName,
    projectType: project.projectType,
    shootType: project.shootType,
    aiEditorOnly: Boolean(project.aiEditorOnly),
    description: project.location ? `Location: ${project.location}` : undefined,
    clientName: project.clientName,
    status: project.status,
    scriptSessionId: scriptSession?.id ?? board?.scriptSessionId,
    scriptTitle: script?.title || scriptSession?.title,
    logline: script?.logline,
    scenes: scenesFromScript(script),
    characters: charactersFromScript(script),
    locations: (board?.locations ?? []).map((l) => l.name).filter(Boolean),
    people: (board?.people ?? []).map((p) => p.name).filter(Boolean),
    shootDays: (board?.productionDays ?? [])
      .slice()
      .sort((a, b) => a.dayNumber - b.dayNumber)
      .map((d) => ({
        id: d.id,
        dayNumber: d.dayNumber,
        date: d.shootDate,
        locationName: d.primaryLocation,
      })),
    shots,
    shotCount: shots.length,
    framedShotCount,
    notes,
  };
}
