import { locationFromSceneHeading } from "@/lib/production/buildCrewPacketBase";
import { ProductionBoard, ProductionDay, ProductionDayShot } from "@/lib/production/types";
import { ScriptDocument } from "@/lib/scriptWriter/types";
import { normalizeSceneRef } from "@/lib/scriptWriter/scriptMappers";

export const DEFAULT_MAX_SHOTS_PER_DAY = 18;

export type ShotLocationGroup = {
  location: string;
  shots: ProductionDayShot[];
};

export function sceneLocationMap(script?: ScriptDocument | null): Map<string, string> {
  const map = new Map<string, string>();
  for (const scene of script?.scenes ?? []) {
    map.set(normalizeSceneRef(scene.sceneNumber), locationFromSceneHeading(scene.heading));
  }
  return map;
}

export function inferShotLocation(
  shot: ProductionDayShot,
  sceneLocations: Map<string, string>
): string {
  const ref = normalizeSceneRef(shot.sceneRef);
  if (ref) {
    const fromScene = sceneLocations.get(ref);
    if (fromScene) return fromScene;
    return `Scene ${ref}`;
  }
  const text = `${shot.label} ${shot.shotName ?? ""} ${shot.notes ?? ""} ${shot.subjectAction ?? ""}`;
  const intExt = text.match(/(?:INT\.|EXT\.)\s+([^-–,]+)/i);
  if (intExt) return intExt[1].trim();
  return "General";
}

export function sortShots(shots: ProductionDayShot[]): ProductionDayShot[] {
  return [...shots].sort((a, b) => {
    const na = a.scoutShotNumber ?? Number.MAX_SAFE_INTEGER;
    const nb = b.scoutShotNumber ?? Number.MAX_SAFE_INTEGER;
    if (na !== nb) return na - nb;
    return a.sortOrder - b.sortOrder;
  });
}

export function groupShotsByLocation(
  shots: ProductionDayShot[],
  sceneLocations: Map<string, string>
): ShotLocationGroup[] {
  const sorted = sortShots(shots);
  const order: string[] = [];
  const groups = new Map<string, ProductionDayShot[]>();

  for (const shot of sorted) {
    const location = inferShotLocation(shot, sceneLocations);
    if (!groups.has(location)) {
      groups.set(location, []);
      order.push(location);
    }
    groups.get(location)!.push(shot);
  }

  return order.map((location) => ({ location, shots: groups.get(location)! }));
}

/** Pack location groups into shoot days — keeps each location together when possible. */
export function splitLocationGroupsIntoDays(
  groups: ShotLocationGroup[],
  options?: { targetDays?: number; maxShotsPerDay?: number }
): ShotLocationGroup[][] {
  const maxPerDay = options?.maxShotsPerDay ?? DEFAULT_MAX_SHOTS_PER_DAY;
  const targetDays = options?.targetDays;

  if (groups.length === 0) return [];

  if (targetDays && targetDays > 0) {
    const bins: ShotLocationGroup[][] = Array.from({ length: targetDays }, () => []);
    const binCounts = Array(targetDays).fill(0);

    for (const group of groups) {
      let best = 0;
      for (let i = 1; i < targetDays; i++) {
        if (binCounts[i] < binCounts[best]) best = i;
      }
      bins[best].push(group);
      binCounts[best] += group.shots.length;
    }
    return bins;
  }

  const days: ShotLocationGroup[][] = [[]];
  let currentCount = 0;

  for (const group of groups) {
    const groupSize = group.shots.length;
    if (currentCount > 0 && currentCount + groupSize > maxPerDay) {
      days.push([]);
      currentCount = 0;
    }
    days[days.length - 1].push(group);
    currentCount += groupSize;
  }

  return days;
}

export function flattenDayGroups(dayGroups: ShotLocationGroup[][]): ProductionDayShot[][] {
  return dayGroups.map((groups) => {
    const shots = groups.flatMap((g) => g.shots);
    return shots.map((shot, index) => ({ ...shot, sortOrder: index }));
  });
}

export function primaryLocationForShots(
  shots: ProductionDayShot[],
  sceneLocations: Map<string, string>
): string | undefined {
  const counts = new Map<string, number>();
  for (const shot of shots) {
    const loc = inferShotLocation(shot, sceneLocations);
    counts.set(loc, (counts.get(loc) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestCount = 0;
  for (const [loc, count] of counts) {
    if (count > bestCount && loc !== "General") {
      best = loc;
      bestCount = count;
    }
  }
  return best;
}

export function suggestDayCount(totalShots: number, locationGroupCount: number): number {
  if (totalShots <= DEFAULT_MAX_SHOTS_PER_DAY) return 1;
  const byLoad = Math.ceil(totalShots / DEFAULT_MAX_SHOTS_PER_DAY);
  const byLocation = Math.min(locationGroupCount, Math.max(1, byLoad));
  return Math.max(byLoad, Math.min(byLocation, Math.ceil(totalShots / 12)));
}

export function collectAllBoardShots(board: { productionDays: ProductionDay[] }): ProductionDayShot[] {
  const seen = new Set<string>();
  const all: ProductionDayShot[] = [];
  for (const day of board.productionDays) {
    for (const shot of day.shots) {
      if (seen.has(shot.id)) continue;
      seen.add(shot.id);
      all.push(shot);
    }
  }
  return sortShots(all);
}

export function buildAutoSplitPlan(params: {
  shots: ProductionDayShot[];
  script?: ScriptDocument | null;
  targetDays?: number;
  maxShotsPerDay?: number;
}): {
  dayShots: ProductionDayShot[][];
  locationGroups: ShotLocationGroup[];
  suggestedDays: number;
} {
  const sceneLocations = sceneLocationMap(params.script);
  const groups = groupShotsByLocation(params.shots, sceneLocations);
  const suggestedDays = params.targetDays ?? suggestDayCount(params.shots.length, groups.length);
  const dayGroups = splitLocationGroupsIntoDays(groups, {
    targetDays: suggestedDays,
    maxShotsPerDay: params.maxShotsPerDay,
  });
  return {
    dayShots: flattenDayGroups(dayGroups),
    locationGroups: groups,
    suggestedDays: dayGroups.length,
  };
}

export function applyAutoSplitToBoard(
  board: { productionDays: ProductionDay[] },
  dayShots: ProductionDayShot[][],
  sceneLocations: Map<string, string>
): ProductionDay[] {
  const nextDays: ProductionDay[] = [];

  for (let i = 0; i < dayShots.length; i++) {
    const existing = board.productionDays[i];
    const shots = dayShots[i] ?? [];
    const primary = primaryLocationForShots(shots, sceneLocations);
    const locationLabel = primary ? `${primary}` : `Day ${i + 1}`;

    if (existing) {
      nextDays.push({
        ...existing,
        dayNumber: i + 1,
        title: primary ? `${primary}` : existing.title,
        shots,
        primaryLocation: primary ?? existing.primaryLocation,
        crewPacket: undefined,
        sceneFrames: i === 0 ? existing.sceneFrames : [],
      });
    } else {
      nextDays.push({
        id: crypto.randomUUID(),
        title: locationLabel,
        dayNumber: i + 1,
        shootDate: "",
        scenes: [...new Set(shots.map((s) => s.sceneRef).filter(Boolean))] as string[],
        schedule: [],
        shots,
        sceneFrames: [],
        primaryLocation: primary,
        crewCall: "7:00 AM",
        lunch: "1:00 PM",
        wrapTime: "6:00 PM",
      });
    }
  }

  return nextDays;
}

export function moveShotBetweenDays(
  board: ProductionBoard,
  shotId: string,
  fromDayId: string,
  toDayId: string
): ProductionDay[] | null {
  if (fromDayId === toDayId) return null;

  const fromDay = board.productionDays.find((d) => d.id === fromDayId);
  const toDay = board.productionDays.find((d) => d.id === toDayId);
  if (!fromDay || !toDay) return null;

  const shot = fromDay.shots.find((s) => s.id === shotId);
  if (!shot) return null;

  const nextShot = { ...shot, sortOrder: toDay.shots.length };

  return board.productionDays.map((d) => {
    if (d.id === fromDayId) {
      return {
        ...d,
        shots: d.shots
          .filter((s) => s.id !== shotId)
          .map((s, index) => ({ ...s, sortOrder: index })),
        crewPacket: undefined,
      };
    }
    if (d.id === toDayId) {
      return {
        ...d,
        shots: [...d.shots, nextShot],
        crewPacket: undefined,
      };
    }
    return d;
  });
}

export function summarizeSplitPlan(
  dayShots: ProductionDayShot[][],
  sceneLocations: Map<string, string>
): string[] {
  return dayShots.map((shots, i) => {
    const primary = primaryLocationForShots(shots, sceneLocations);
    return `Day ${i + 1}: ${shots.length} shots${primary ? ` · ${primary}` : ""}`;
  });
}
