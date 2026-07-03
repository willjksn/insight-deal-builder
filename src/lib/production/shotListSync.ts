import { ScoutShotListItem, ScoutShotType } from "@/lib/scout/types";
import { ProductionDayShot } from "@/lib/production/types";
import { formatProductionShotLabel } from "@/lib/production/shotLabels";
import { shotsFromScoutList } from "@/lib/production/scoutImport";

const SCOUT_SHOT_TYPES = new Set<string>([
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

function normalizeShotType(raw?: string): ScoutShotType {
  const key = raw?.trim().toLowerCase().replace(/\s+/g, "_") ?? "";
  if (SCOUT_SHOT_TYPES.has(key)) return key as ScoutShotType;
  return "medium_shot";
}

function productionShotSignature(shot: ProductionDayShot): string {
  return [
    shot.scoutShotNumber ?? "",
    shot.shotName?.trim() ?? "",
    shot.shotType ?? "",
    shot.subjectAction?.trim() ?? "",
    shot.cameraMovement?.trim() ?? "",
    shot.sceneRef?.trim() ?? "",
  ].join("|");
}

function scoutShotSignature(shot: ScoutShotListItem): string {
  return [
    shot.shotNumber,
    shot.shotName?.trim() ?? "",
    shot.shotType,
    shot.subjectAction?.trim() ?? "",
    shot.cameraMovement?.trim() ?? "",
    shot.scene?.trim() ?? "",
  ].join("|");
}

export function productionAndScoutShotListsMatch(
  production: ProductionDayShot[],
  scout: ScoutShotListItem[]
): boolean {
  if (production.length !== scout.length) return false;
  return production.every((shot, index) => {
    return productionShotSignature(shot) === scoutShotSignature(scout[index]);
  });
}

/** Pre-production board → scout session shot list. */
export function scoutShotsFromProductionList(items: ProductionDayShot[]): ScoutShotListItem[] {
  return items.map((shot, index) => {
    const shotNumber = shot.scoutShotNumber ?? index + 1;
    const shotName =
      shot.shotName?.trim() ||
      formatProductionShotLabel(shot).replace(/^\d+\.\s*/, "").split(" — ")[0]?.trim() ||
      "";
    return {
      shotNumber,
      ...(shotName ? { shotName } : {}),
      scene: shot.sceneRef?.trim() || "1",
      shotType: normalizeShotType(shot.shotType),
      camera: "",
      lens: "",
      frameRate: "24fps",
      cameraMovement: shot.cameraMovement?.trim() ?? "",
      subjectAction: shot.subjectAction?.trim() ?? "",
      blockingNotes: "",
      lightingNotes: "",
      audioDialogueNotes: "",
      priority: "must_have",
      status: shot.done ? "shot" : "planned",
      notes: shot.notes?.trim() ?? "",
    };
  });
}

/** Scout session → pre-production board, preserving checkboxes and row ids when possible. */
export function mergeProductionShotsFromScout(
  existing: ProductionDayShot[],
  scoutItems: ScoutShotListItem[]
): ProductionDayShot[] {
  const imported = shotsFromScoutList(scoutItems);
  const doneByNumber = new Map<number, boolean>();
  const idByNumber = new Map<number, string>();

  for (const shot of existing) {
    if (shot.scoutShotNumber == null) continue;
    doneByNumber.set(shot.scoutShotNumber, shot.done);
    idByNumber.set(shot.scoutShotNumber, shot.id);
  }

  return imported.map((shot) => {
    const num = shot.scoutShotNumber;
    if (num == null) return shot;
    return {
      ...shot,
      id: idByNumber.get(num) ?? shot.id,
      done: doneByNumber.get(num) ?? shot.done,
    };
  });
}
