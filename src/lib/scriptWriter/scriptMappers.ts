import {
  ProductionDayShot,
  ProductionInspirationImage,
  ProductionLocationEntry,
  ProductionPerson,
  ProductionSceneFrame,
} from "@/lib/production/types";
import {
  buildInspirationPool,
  InspirationPoolItem,
  pickInspirationForFrame,
} from "@/lib/production/storyboardMatch";
import { formatShotTypeLabel } from "@/lib/production/shotLabels";
import { shotListNotesBlock } from "@/lib/scriptWriter/shotListDisplay";
import {
  ScriptDocument,
  ScriptInspirationImage,
  ScriptStoryboardFrame,
  ScriptSuggestedShot,
} from "@/lib/scriptWriter/types";

/** AI / legacy sessions may store scene numbers as numbers — normalize for string ops. */
export function normalizeSceneRef(value: string | number | undefined | null): string {
  if (value == null) return "";
  return String(value).trim();
}

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

function normalizeShotType(raw: string): string {
  const key = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (SHOT_TYPES.has(key)) return key;
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

export function productionShotsFromScript(script: ScriptDocument): ProductionDayShot[] {
  return script.suggestedShots.map((shot, index) => {
    const shotType = normalizeShotType(shot.shotType);
    const typeLabel = formatShotTypeLabel(shotType);
    const name = shot.shotName?.trim();
    const subject = shot.subjectAction?.trim();
    const entry: ProductionDayShot = {
      id: crypto.randomUUID(),
      label: name
        ? `${shot.shotNumber}. ${name}`
        : `${shot.shotNumber}. ${typeLabel}${subject ? ` — ${subject.slice(0, 56)}` : ""}`,
      done: false,
      scoutShotNumber: shot.shotNumber,
      sortOrder: index,
      shotType,
      ...(name ? { shotName: name } : {}),
      ...(subject ? { subjectAction: subject } : {}),
      ...(shot.cameraMovement?.trim() ? { cameraMovement: shot.cameraMovement.trim() } : {}),
      ...(normalizeSceneRef(shot.sceneNumber)
        ? { sceneRef: normalizeSceneRef(shot.sceneNumber) }
        : {}),
    };
    const notes = shotListNotesBlock(shot);
    if (notes) entry.notes = notes;
    return entry;
  });
}

/** Refresh shot list from script while preserving checkbox state by shot number. */
export function mergeProductionShotsFromScript(
  existing: ProductionDayShot[],
  script: ScriptDocument
): ProductionDayShot[] {
  const doneByNumber = new Map<number, boolean>();
  for (const shot of existing) {
    if (shot.scoutShotNumber != null) {
      doneByNumber.set(shot.scoutShotNumber, shot.done);
    }
  }
  return productionShotsFromScript(script).map((shot) => {
    if (shot.scoutShotNumber == null || !doneByNumber.has(shot.scoutShotNumber)) {
      return shot;
    }
    return { ...shot, done: doneByNumber.get(shot.scoutShotNumber)! };
  });
}

export function sceneNumbersFromScript(script: ScriptDocument): string[] {
  return script.scenes.map((s) => normalizeSceneRef(s.sceneNumber)).filter(Boolean);
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
    ...(character.description?.trim() ? { notes: character.description.trim() } : {}),
    sortOrder: index,
  }));
}

export function filmingNotesFromScript(script: ScriptDocument): string {
  const parts = [
    script.genre ? `Genre: ${script.genre}` : null,
    script.idealRuntime ? `Runtime: ${script.idealRuntime}` : null,
    script.logline ? `Logline: ${script.logline}` : null,
    script.productionPack?.premise ? `Premise: ${script.productionPack.premise}` : null,
    script.productionPack?.tone ? `Tone: ${script.productionPack.tone}` : null,
  ].filter(Boolean);
  return parts.join("\n");
}

export function locationsFromInspirationImages(
  images: { tag: string; label?: string; storageUrl?: string }[]
): ProductionLocationEntry[] {
  return images
    .filter((img) => img.tag === "location")
    .map((img, index) => ({
      id: crypto.randomUUID(),
      name: img.label?.trim() || `Location ${index + 1}`,
      status: "needed" as const,
      ...(img.storageUrl
        ? {
            notes: "Reference photo from script writer",
            photoUrl: img.storageUrl,
          }
        : {}),
    }));
}

function heroShotForScene(
  sceneNumber: string | number,
  shots: ScriptSuggestedShot[]
): ScriptSuggestedShot | undefined {
  const ref = normalizeSceneRef(sceneNumber);
  const sceneShots = shots.filter((s) => normalizeSceneRef(s.sceneNumber) === ref);
  return (
    sceneShots.find((s) => normalizeShotType(s.shotType) === "master_wide") ?? sceneShots[0]
  );
}

function audioFromScene(script: ScriptDocument, sceneNumber: string): string | undefined {
  const beat = script.productionPack?.timedBeats?.find((b) => b.audio?.trim());
  if (beat?.audio?.trim()) return beat.audio.trim();
  const row = script.productionPack?.editTimeline?.find((r) => r.audio?.trim());
  return row?.audio?.trim();
}

/** Build scene frames from script when AI omitted storyboardFrames. */
export function deriveStoryboardFramesFromScript(script: ScriptDocument): ScriptStoryboardFrame[] {
  return script.scenes.map((scene) => {
    const hero = heroShotForScene(scene.sceneNumber, script.suggestedShots);
    const shotType = hero ? normalizeShotType(hero.shotType) : "master_wide";
    const typeLabel = formatShotTypeLabel(shotType);
    return {
      sceneNumber: normalizeSceneRef(scene.sceneNumber),
      sceneHeading: scene.heading,
      shotType,
      shotName: hero?.shotName ?? `${typeLabel} — Scene ${normalizeSceneRef(scene.sceneNumber)}`,
      caption: hero?.description?.trim() || scene.action?.trim() || scene.heading,
      audioCue: audioFromScene(script, normalizeSceneRef(scene.sceneNumber)),
    };
  });
}

function scriptFrameToProduction(
  frame: ScriptStoryboardFrame,
  index: number,
  pool: InspirationPoolItem[],
  usedIds: Set<string>
): ProductionSceneFrame {
  const img = pickInspirationForFrame(frame, pool, usedIds);
  if (img) usedIds.add(img.id);
  const shotName = frame.shotName?.trim();
  const sceneHeading = frame.sceneHeading?.trim();
  const audioCue = frame.audioCue?.trim();
  return {
    id: crypto.randomUUID(),
    sceneRef: normalizeSceneRef(frame.sceneNumber),
    shotType: normalizeShotType(frame.shotType),
    caption: (frame.caption ?? "").trim(),
    sortOrder: index,
    ...(sceneHeading ? { sceneHeading } : {}),
    ...(shotName ? { shotName } : {}),
    ...(audioCue ? { audioCue } : {}),
    ...(img?.imageUrl ? { referenceImageUrl: img.imageUrl } : {}),
    ...(img?.storagePath ? { referenceImageStoragePath: img.storagePath } : {}),
    ...(img ? { referenceImageSource: "script_match" as const } : {}),
    ...(img?.id ? { inspirationImageId: img.id } : {}),
  };
}

export function productionSceneFramesFromScript(
  script: ScriptDocument,
  sessionImages: ScriptInspirationImage[] = [],
  boardImages: ProductionInspirationImage[] = []
): ProductionSceneFrame[] {
  const frames =
    script.storyboardFrames?.length
      ? script.storyboardFrames
      : deriveStoryboardFramesFromScript(script);
  const pool = buildInspirationPool(sessionImages, boardImages);
  const usedIds = new Set<string>();
  return frames.map((frame, index) => scriptFrameToProduction(frame, index, pool, usedIds));
}

/** Refresh scene frames from script; keep user-uploaded images per scene. */
export function mergeProductionSceneFramesFromScript(
  existing: ProductionSceneFrame[],
  script: ScriptDocument,
  sessionImages: ScriptInspirationImage[] = [],
  boardImages: ProductionInspirationImage[] = []
): ProductionSceneFrame[] {
  const uploadByScene = new Map<string, ProductionSceneFrame>();
  for (const frame of existing) {
    if (frame.referenceImageSource === "upload" && frame.referenceImageUrl) {
      uploadByScene.set(frame.sceneRef, frame);
    }
  }
  return productionSceneFramesFromScript(script, sessionImages, boardImages).map((frame) => {
    const kept = uploadByScene.get(frame.sceneRef);
    if (!kept) return frame;
    return {
      ...frame,
      referenceImageUrl: kept.referenceImageUrl,
      referenceImageStoragePath: kept.referenceImageStoragePath,
      referenceImageSource: "upload",
      inspirationImageId: kept.inspirationImageId,
    };
  });
}

export function inspirationImagesFromSession(
  sessionImages: ScriptInspirationImage[],
  existing: ProductionInspirationImage[]
): ProductionInspirationImage[] {
  const urls = new Set(existing.map((i) => i.imageUrl));
  const merged = [...existing];
  for (const img of sessionImages) {
    if (urls.has(img.storageUrl)) continue;
    urls.add(img.storageUrl);
    merged.push({
      id: img.id,
      imageUrl: img.storageUrl,
      storagePath: img.storagePath,
      sortOrder: merged.length,
      ...(img.label?.trim() ? { caption: img.label.trim() } : {}),
    });
  }
  return merged;
}
