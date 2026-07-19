import type { ProductionDay, ProductionDayShot } from "@/lib/production/types";
import type { ProductionInspirationImage } from "@/lib/production/types";
import {
  productionShotsFromScript,
} from "@/lib/scriptWriter/scriptMappers";
import type { ScriptDocument, ScriptInspirationImage } from "@/lib/scriptWriter/types";

const MANUAL_IMAGE_SOURCES = new Set([
  "upload",
  "scene_migrate",
  "inspiration",
  "ai_generate",
]);

function preferExistingText(existing?: string, incoming?: string): string | undefined {
  const e = existing?.trim();
  if (e) return existing;
  const i = incoming?.trim();
  return i ? incoming : undefined;
}

/**
 * Merge a newly generated script shot onto an existing production shot.
 * Preserves: id, done, frame images, and non-empty manual DP fields.
 */
export function mergeShotPreserveManual(
  existing: ProductionDayShot,
  incoming: ProductionDayShot
): ProductionDayShot {
  const keepImage = Boolean(existing.referenceImageUrl?.trim());
  const preferManualFields =
    keepImage &&
    existing.referenceImageSource &&
    MANUAL_IMAGE_SOURCES.has(existing.referenceImageSource);

  return {
    ...incoming,
    id: existing.id,
    done: existing.done,
    sortOrder: existing.sortOrder,
    ...(keepImage
      ? {
          referenceImageUrl: existing.referenceImageUrl,
          referenceImageStoragePath: existing.referenceImageStoragePath,
          referenceImageSource: existing.referenceImageSource,
          inspirationImageId: existing.inspirationImageId,
        }
      : {
          ...(incoming.referenceImageUrl
            ? {
                referenceImageUrl: incoming.referenceImageUrl,
                referenceImageStoragePath: incoming.referenceImageStoragePath,
                referenceImageSource: incoming.referenceImageSource,
                inspirationImageId: incoming.inspirationImageId,
              }
            : {}),
        }),
    shotName: preferExistingText(existing.shotName, incoming.shotName),
    description: preferExistingText(existing.description, incoming.description),
    subjectAction: preferExistingText(existing.subjectAction, incoming.subjectAction),
    cameraMovement: preferExistingText(existing.cameraMovement, incoming.cameraMovement),
    lens: preferExistingText(existing.lens, incoming.lens),
    lighting: preferExistingText(existing.lighting, incoming.lighting),
    framing: preferExistingText(existing.framing, incoming.framing),
    cameraHeight: preferExistingText(existing.cameraHeight, incoming.cameraHeight),
    blocking: preferExistingText(existing.blocking, incoming.blocking),
    support: preferExistingText(existing.support, incoming.support),
    cameraBody: preferExistingText(existing.cameraBody, incoming.cameraBody),
    audioCue: preferExistingText(existing.audioCue, incoming.audioCue),
    audioNotes: preferExistingText(existing.audioNotes, incoming.audioNotes),
    setupNotes: preferExistingText(existing.setupNotes, incoming.setupNotes),
    purpose: preferExistingText(existing.purpose, incoming.purpose),
    exposureNotes: preferExistingText(existing.exposureNotes, incoming.exposureNotes),
    editNote: preferExistingText(existing.editNote, incoming.editNote),
    duration: preferExistingText(existing.duration, incoming.duration),
    sceneHeading: preferExistingText(existing.sceneHeading, incoming.sceneHeading),
    // If user framed manually, keep their label when present
    label: preferManualFields
      ? preferExistingText(existing.label, incoming.label) ?? incoming.label
      : incoming.label,
    notes: preferExistingText(existing.notes, incoming.notes),
    assignedLights: existing.assignedLights?.length
      ? existing.assignedLights
      : incoming.assignedLights,
    assignedProps: existing.assignedProps?.length
      ? existing.assignedProps
      : incoming.assignedProps,
  };
}

export function collectShotsByDay(days: ProductionDay[]): {
  byNumber: Map<number, { shot: ProductionDayShot; dayId: string }>;
  manual: { shot: ProductionDayShot; dayId: string }[];
} {
  const byNumber = new Map<number, { shot: ProductionDayShot; dayId: string }>();
  const manual: { shot: ProductionDayShot; dayId: string }[] = [];
  for (const day of days) {
    for (const shot of day.shots ?? []) {
      if (shot.scoutShotNumber != null) {
        byNumber.set(shot.scoutShotNumber, { shot, dayId: day.id });
      } else {
        manual.push({ shot, dayId: day.id });
      }
    }
  }
  return { byNumber, manual };
}

/**
 * Refresh board coverage from script without clobbering manual frames / day placement.
 * - Matches by scoutShotNumber
 * - Keeps shots on their current day when possible
 * - Appends brand-new script shots to day 1 (or first day)
 * - Keeps manual shots (no scoutShotNumber)
 */
export function mergeBoardCoverageFromScript(
  days: ProductionDay[],
  script: ScriptDocument,
  sessionImages: ScriptInspirationImage[] = [],
  boardImages: ProductionInspirationImage[] = []
): ProductionDay[] {
  if (!days.length) return days;

  const incoming = productionShotsFromScript(script, sessionImages, boardImages);
  const { byNumber, manual } = collectShotsByDay(days);
  const firstDayId = [...days].sort((a, b) => a.dayNumber - b.dayNumber)[0].id;

  const buckets = new Map<string, ProductionDayShot[]>();
  for (const day of days) buckets.set(day.id, []);

  const usedNumbers = new Set<number>();

  for (const next of incoming) {
    const num = next.scoutShotNumber;
    const prior = num != null ? byNumber.get(num) : undefined;
    if (prior) {
      usedNumbers.add(num!);
      const merged = mergeShotPreserveManual(prior.shot, next);
      buckets.get(prior.dayId)!.push(merged);
    } else {
      buckets.get(firstDayId)!.push({ ...next, id: crypto.randomUUID() });
    }
  }

  // Keep unmatched numbered shots (removed from script) if they have a manual frame
  for (const [num, { shot, dayId }] of byNumber) {
    if (usedNumbers.has(num)) continue;
    if (shot.referenceImageUrl?.trim() || shot.done) {
      buckets.get(dayId)!.push(shot);
    }
  }

  for (const { shot, dayId } of manual) {
    buckets.get(dayId)!.push(shot);
  }

  return days.map((day) => {
    const shots = (buckets.get(day.id) ?? []).map((s, i) => ({ ...s, sortOrder: i }));
    return { ...day, shots };
  });
}

/** Single-day merge used by day shot list "Refresh from script". */
export function mergeDayShotsFromScript(
  existing: ProductionDayShot[],
  script: ScriptDocument,
  sessionImages: ScriptInspirationImage[] = [],
  boardImages: ProductionInspirationImage[] = []
): ProductionDayShot[] {
  const fakeDay: ProductionDay = {
    id: "day",
    title: "Day",
    dayNumber: 1,
    scenes: [],
    schedule: [],
    shots: existing,
  };
  const merged = mergeBoardCoverageFromScript(
    [fakeDay],
    script,
    sessionImages,
    boardImages
  );
  return merged[0]?.shots ?? [];
}
