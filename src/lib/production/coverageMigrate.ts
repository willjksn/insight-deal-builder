import type { ProductionDay, ProductionDayShot, ProductionSceneFrame } from "@/lib/production/types";

function sceneKey(ref: string | undefined): string {
  return (ref ?? "").trim().toLowerCase();
}

/**
 * Lift legacy scene-frame images onto shot frames (shot = storyboard unit).
 * Prefers an empty master_wide / first shot in the scene. Does not overwrite existing shot images.
 */
export function migrateSceneFramesOntoShots(
  shots: ProductionDayShot[],
  sceneFrames: ProductionSceneFrame[] | undefined
): { shots: ProductionDayShot[]; migrated: number } {
  if (!sceneFrames?.length) return { shots, migrated: 0 };

  const framesWithImage = sceneFrames
    .filter((f) => Boolean(f.referenceImageUrl?.trim()))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (!framesWithImage.length) return { shots, migrated: 0 };

  const next = shots.map((s) => ({ ...s }));
  let migrated = 0;

  for (const frame of framesWithImage) {
    const key = sceneKey(frame.sceneRef);
    if (!key) continue;

    const candidates = next
      .map((shot, index) => ({ shot, index }))
      .filter(({ shot }) => sceneKey(shot.sceneRef) === key && !shot.referenceImageUrl?.trim());

    if (!candidates.length) continue;

    const pick =
      candidates.find(({ shot }) => (shot.shotType ?? "").includes("master") || shot.shotType === "master_wide") ??
      candidates[0];

    next[pick.index] = {
      ...pick.shot,
      referenceImageUrl: frame.referenceImageUrl,
      referenceImageStoragePath: frame.referenceImageStoragePath,
      referenceImageSource: "scene_migrate",
      inspirationImageId: frame.inspirationImageId,
      ...(frame.audioCue?.trim() && !pick.shot.audioCue ? { audioCue: frame.audioCue.trim() } : {}),
      ...(frame.caption?.trim() && !pick.shot.description ? { description: frame.caption.trim() } : {}),
      ...(frame.sceneHeading?.trim() && !pick.shot.sceneHeading
        ? { sceneHeading: frame.sceneHeading.trim() }
        : {}),
    };
    migrated += 1;
  }

  return { shots: next, migrated };
}

/** Run scene→shot image migration across all production days. */
export function migrateBoardCoverageDays(days: ProductionDay[]): {
  days: ProductionDay[];
  migrated: number;
} {
  let migrated = 0;
  const nextDays = days.map((day) => {
    const result = migrateSceneFramesOntoShots(day.shots ?? [], day.sceneFrames);
    migrated += result.migrated;
    if (result.migrated === 0) return day;
    return { ...day, shots: result.shots };
  });
  return { days: nextDays, migrated };
}

export function countCoverageShots(days: ProductionDay[]): number {
  return days.reduce((n, d) => n + (d.shots?.length ?? 0), 0);
}

export function countCoverageWithImages(days: ProductionDay[]): number {
  return days.reduce(
    (n, d) => n + (d.shots?.filter((s) => Boolean(s.referenceImageUrl?.trim())).length ?? 0),
    0
  );
}
