import type { ShootGuide, ShootGuideShot, ShotVisualAsset } from "@/lib/shootGuide/types";
import type { ProductionDay, ProductionDayShot, ProductionShotMedia } from "@/lib/production/types";

export function sceneShotKey(sourceSceneId: string, sourceShotId: string): string {
  return `${sourceSceneId}:${sourceShotId}`;
}

function latestReady(shot: ShootGuideShot, type: ShotVisualAsset["type"]): ShotVisualAsset | null {
  return (
    [...(shot.visualAssets ?? [])]
      .reverse()
      .find((asset) => asset.type === type && asset.status === "ready" && asset.storageUrl) ?? null
  );
}

function mediaFromAsset(asset: ShotVisualAsset | null, role: ProductionShotMedia["role"], label: string): ProductionShotMedia | null {
  if (!asset?.storageUrl) return null;
  return {
    id: asset.id,
    role,
    url: asset.storageUrl,
    storagePath: asset.storagePath || undefined,
    label,
    mimeType: asset.mimeType || undefined,
  };
}

export function productionShotFromScene(guide: ShootGuide, shot: ShootGuideShot, sortOrder: number): ProductionDayShot {
  const storyboard = latestReady(shot, "storyboard");
  const still = latestReady(shot, "ai_still");
  const motion = latestReady(shot, "ai_motion");
  const preview = storyboard || still;
  const sceneNotes = [shot.specialRequirements, shot.continuityRequirements].filter(Boolean).join("\n");
  const referenceMedia = (guide.references ?? [])
    .filter((ref) => ref.storageUrl)
    .map((ref) => ({
      id: ref.id,
      role: "planned_reference" as const,
      url: ref.storageUrl,
      storagePath: ref.storagePath,
      label: ref.kind,
    }));
  const planned = [mediaFromAsset(storyboard, "planned_reference", "Storyboard"), ...referenceMedia].filter(
    (item): item is ProductionShotMedia => Boolean(item)
  );
  const previs = [mediaFromAsset(still, "ai_previs", "AI still"), mediaFromAsset(motion, "ai_previs", "AI motion")].filter(
    (item): item is ProductionShotMedia => Boolean(item)
  );
  return {
    id: crypto.randomUUID(),
    label: shot.title || "Untitled shot",
    shotName: shot.title || "Untitled shot",
    description: shot.purpose || "",
    purpose: shot.purpose || "",
    framing: shot.framing || "",
    lens: shot.lens || shot.focalLength || "",
    cameraAngle: shot.cameraAngle || "",
    cameraMovement: shot.movement || "",
    lighting: shot.lightingChanges || "",
    duration: shot.duration || "",
    sceneNotes,
    notes: sceneNotes,
    sceneRef: guide.title,
    sceneHeading: guide.title,
    sourceSceneId: guide.id,
    sourceShotId: shot.id,
    sourceSceneTitle: guide.title,
    sourceSyncedAt: new Date().toISOString(),
    productionStatus: "planned",
    done: false,
    sortOrder,
    referenceImageUrl: preview?.storageUrl || "",
    referenceImageStoragePath: preview?.storagePath || "",
    referenceImageSource: preview ? "scene_migrate" : undefined,
    media: [...planned, ...previs],
  };
}

function capturedMedia(shot: ProductionDayShot): ProductionShotMedia[] {
  return (shot.media ?? []).filter((item) => item.role === "captured_footage");
}

function planningKey(shot: ProductionDayShot): string {
  const planned = (shot.media ?? [])
    .filter((item) => item.role !== "captured_footage")
    .map((item) => `${item.role}:${item.url}`)
    .join("|");
  return [
    shot.label,
    shot.description,
    shot.framing,
    shot.lens,
    shot.cameraAngle,
    shot.cameraMovement,
    shot.lighting,
    shot.duration,
    shot.sceneNotes,
    shot.referenceImageUrl,
    planned,
  ].join("\n");
}

export type SceneSyncShotResult = "updated" | "current" | "missing" | "failed";

export function refreshLinkedShots(
  days: ProductionDay[],
  guides: ShootGuide[],
  options?: { productionShotId?: string }
): {
  days: ProductionDay[];
  updated: string[];
  current: string[];
  missing: string[];
  failed: { id: string; error: string }[];
} {
  const byId = new Map(guides.map((guide) => [guide.id, guide]));
  const updated: string[] = [];
  const current: string[] = [];
  const missing: string[] = [];
  const failed: { id: string; error: string }[] = [];
  const nextDays = days.map((day) => ({ ...day, shots: day.shots.map((shot) => ({ ...shot })) }));
  for (const day of nextDays) {
    day.shots = day.shots.map((shot) => {
      if (!shot.sourceSceneId || !shot.sourceShotId) return shot;
      if (options?.productionShotId && shot.id !== options.productionShotId) return shot;
      try {
        const guide = byId.get(shot.sourceSceneId);
        const source = guide?.shots?.find((item) => item.id === shot.sourceShotId);
        if (!guide || !source) {
          missing.push(shot.id);
          return { ...shot, sourceUnavailable: true };
        }
        const incoming = productionShotFromScene(guide, source, shot.sortOrder);
        const synced = { ...syncProductionShot(shot, incoming), sourceUnavailable: false };
        if (planningKey(shot) === planningKey(synced)) {
          current.push(shot.id);
          return { ...shot, sourceUnavailable: false, sourceSyncedAt: synced.sourceSyncedAt };
        }
        updated.push(shot.id);
        return synced;
      } catch (err) {
        failed.push({ id: shot.id, error: err instanceof Error ? err.message : "Update failed" });
        return shot;
      }
    });
  }
  return { days: nextDays, updated, current, missing, failed };
}

export function syncProductionShot(existing: ProductionDayShot, incoming: ProductionDayShot): ProductionDayShot {
  const notesUntouched = Boolean(existing.notes && existing.notes !== existing.sceneNotes);
  return {
    ...existing,
    label: incoming.label,
    shotName: incoming.shotName,
    description: incoming.description,
    purpose: incoming.purpose,
    framing: incoming.framing,
    lens: incoming.lens,
    cameraAngle: incoming.cameraAngle,
    cameraMovement: incoming.cameraMovement,
    lighting: incoming.lighting,
    duration: incoming.duration,
    sceneNotes: incoming.sceneNotes,
    notes: notesUntouched ? existing.notes : incoming.sceneNotes,
    sceneRef: incoming.sceneRef,
    sceneHeading: incoming.sceneHeading,
    sourceSceneTitle: incoming.sourceSceneTitle,
    sourceSyncedAt: incoming.sourceSyncedAt,
    referenceImageUrl: incoming.referenceImageUrl || existing.referenceImageUrl,
    referenceImageStoragePath: incoming.referenceImageStoragePath || existing.referenceImageStoragePath,
    referenceImageSource: incoming.referenceImageUrl ? incoming.referenceImageSource : existing.referenceImageSource,
    media: [...(incoming.media ?? []).filter((item) => item.role !== "captured_footage"), ...capturedMedia(existing)],
  };
}

export function mergeSceneShotsIntoDays(
  days: ProductionDay[],
  guide: ShootGuide,
  selected: ShootGuideShot[]
): { days: ProductionDay[]; created: number; updated: number; dayId: string } {
  const nextDays = days.length ? days.map((day) => ({ ...day, shots: [...(day.shots ?? [])] })) : [];
  if (!nextDays.length) {
    nextDays.push({
      id: crypto.randomUUID(),
      title: "Day 1",
      dayNumber: 1,
      scenes: [],
      schedule: [],
      shots: [],
    });
  }
  const index = new Map<string, { dayIndex: number; shotIndex: number }>();
  nextDays.forEach((day, dayIndex) => {
    day.shots.forEach((shot, shotIndex) => {
      if (shot.sourceSceneId && shot.sourceShotId) {
        index.set(sceneShotKey(shot.sourceSceneId, shot.sourceShotId), { dayIndex, shotIndex });
      }
    });
  });
  let created = 0;
  let updated = 0;
  let dayId = nextDays[0].id;
  for (const shot of selected) {
    const found = index.get(sceneShotKey(guide.id, shot.id));
    if (found) {
      const day = nextDays[found.dayIndex];
      const existing = day.shots[found.shotIndex];
      day.shots[found.shotIndex] = syncProductionShot(existing, productionShotFromScene(guide, shot, existing.sortOrder));
      updated += 1;
      dayId = day.id;
      continue;
    }
    const day = nextDays[0];
    const incoming = productionShotFromScene(guide, shot, day.shots.length);
    day.shots.push(incoming);
    index.set(sceneShotKey(guide.id, shot.id), { dayIndex: 0, shotIndex: day.shots.length - 1 });
    created += 1;
    dayId = day.id;
  }
  return { days: nextDays, created, updated, dayId };
}
