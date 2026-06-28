import { ScoutShotListItem, ScoutShotType } from "@/lib/scout/types";
import {
  ProductionDayShot,
  ProductionLocationEntry,
  ProductionPerson,
} from "@/lib/production/types";
import { ScriptDocument, ScriptSuggestedShot } from "@/lib/scriptWriter/types";

const SHOT_TYPES = new Set<string>([
  "master_wide",
  "medium_shot",
  "close_up",
  "insert_shot",
  "reaction_shot",
  "movement_shot",
  "vertical_social_shot",
  "thumbnail_shot",
  "bts_shot",
  "room_tone",
  "wild_line",
]);

function normalizeShotType(raw: string): ScoutShotType {
  const key = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (SHOT_TYPES.has(key)) return key as ScoutShotType;
  if (key.includes("close")) return "close_up";
  if (key.includes("wide") || key.includes("master")) return "master_wide";
  if (key.includes("insert")) return "insert_shot";
  if (key.includes("reaction")) return "reaction_shot";
  if (key.includes("move") || key.includes("dolly") || key.includes("tracking")) {
    return "movement_shot";
  }
  if (key.includes("vertical") || key.includes("social")) return "vertical_social_shot";
  return "medium_shot";
}

export function scoutShotsFromScript(script: ScriptDocument): ScoutShotListItem[] {
  return script.suggestedShots.map((shot) => scriptShotToScout(shot));
}

function scriptShotToScout(shot: ScriptSuggestedShot): ScoutShotListItem {
  return {
    shotNumber: shot.shotNumber,
    shotName: shot.shotName?.trim(),
    scene: shot.sceneNumber,
    shotType: normalizeShotType(shot.shotType),
    camera: "TBD",
    lens: "TBD",
    frameRate: "24fps",
    cameraMovement: shot.cameraMovement?.trim() || "static",
    subjectAction: shot.subjectAction?.trim() || shot.description.trim(),
    blockingNotes: "",
    lightingNotes: "",
    audioDialogueNotes: "",
    priority: "must_have",
    status: "planned",
    notes: shot.description.trim(),
  };
}

export function productionShotsFromScript(script: ScriptDocument): ProductionDayShot[] {
  return script.suggestedShots.map((shot, index) => {
    const entry: ProductionDayShot = {
      id: crypto.randomUUID(),
      label: shot.shotName?.trim()
        ? `${shot.shotNumber}. ${shot.shotName.trim()}`
        : `${shot.shotNumber}. ${shot.description.trim().slice(0, 60)}`,
      done: false,
      scoutShotNumber: shot.shotNumber,
      sortOrder: index,
    };
    if (shot.sceneNumber?.trim()) entry.sceneRef = shot.sceneNumber.trim();
    const notes = [shot.description, shot.cameraMovement].filter(Boolean).join(" · ");
    if (notes) entry.notes = notes;
    return entry;
  });
}

export function sceneNumbersFromScript(script: ScriptDocument): string[] {
  return script.scenes.map((s) => s.sceneNumber).filter(Boolean);
}

export function locationsFromScript(script: ScriptDocument): ProductionLocationEntry[] {
  const seen = new Set<string>();
  const locations: ProductionLocationEntry[] = [];
  for (const scene of script.scenes) {
    const name = parseLocationFromHeading(scene.heading);
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    locations.push({
      id: crypto.randomUUID(),
      name,
      status: "needed",
      notes: scene.heading,
    });
  }
  return locations;
}

function parseLocationFromHeading(heading: string): string | null {
  const match = heading.match(/^(?:INT\.|EXT\.|INT\/EXT\.)\s+(.+?)(?:\s+-|\s+–|$)/i);
  return match?.[1]?.trim() ?? null;
}

export function castFromScript(script: ScriptDocument): ProductionPerson[] {
  return script.characters.map((character, index) => ({
    id: crypto.randomUUID(),
    group: "cast" as const,
    name: character.name.trim(),
    role: character.role.trim() || "Cast",
    notes: character.description?.trim(),
    sortOrder: index,
  }));
}

export function filmingNotesFromScript(script: ScriptDocument): string {
  const parts = [
    script.genre ? `Genre: ${script.genre}` : null,
    script.idealRuntime ? `Runtime: ${script.idealRuntime}` : null,
    script.logline ? `Logline: ${script.logline}` : null,
  ].filter(Boolean);
  return parts.join("\n");
}
