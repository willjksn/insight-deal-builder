import { ScoutShotListItem, ScoutShotType } from "@/lib/scout/types";
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
import {
  ScriptDocument,
  ScriptInspirationImage,
  ScriptStoryboardFrame,
  ScriptSuggestedShot,
} from "@/lib/scriptWriter/types";

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
      shotName: name,
      subjectAction: subject,
      cameraMovement: shot.cameraMovement?.trim(),
    };
    if (shot.sceneNumber?.trim()) entry.sceneRef = shot.sceneNumber.trim();
    const notes = [shot.description, shot.lens, shot.lighting, shot.purpose]
      .filter(Boolean)
      .join(" · ");
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
      notes: img.storageUrl ? "Reference photo from script writer" : undefined,
      photoUrl: img.storageUrl,
    }));
}

function heroShotForScene(
  sceneNumber: string,
  shots: ScriptSuggestedShot[]
): ScriptSuggestedShot | undefined {
  const sceneShots = shots.filter((s) => s.sceneNumber === sceneNumber);
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
      sceneNumber: scene.sceneNumber,
      sceneHeading: scene.heading,
      shotType,
      shotName: hero?.shotName ?? `${typeLabel} — Scene ${scene.sceneNumber}`,
      caption: hero?.description?.trim() || scene.action.trim() || scene.heading,
      audioCue: audioFromScene(script, scene.sceneNumber),
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
  return {
    id: crypto.randomUUID(),
    sceneRef: frame.sceneNumber.trim(),
    sceneHeading: frame.sceneHeading?.trim(),
    shotType: normalizeShotType(frame.shotType),
    shotName: frame.shotName?.trim(),
    caption: frame.caption.trim(),
    audioCue: frame.audioCue?.trim(),
    referenceImageUrl: img?.imageUrl,
    referenceImageStoragePath: img?.storagePath,
    referenceImageSource: img ? "script_match" : undefined,
    inspirationImageId: img?.id,
    sortOrder: index,
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
      caption: img.label,
      sortOrder: merged.length,
    });
  }
  return merged;
}
