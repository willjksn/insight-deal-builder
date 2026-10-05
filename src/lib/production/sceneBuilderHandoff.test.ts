import { describe, expect, it } from "vitest";
import { mergeSceneShotsIntoDays, refreshLinkedShots, sceneShotKey } from "./sceneBuilderHandoff";
import type { ShootGuide, ShootGuideShot } from "@/lib/shootGuide/types";
import type { ProductionDay } from "./types";

function guide(): ShootGuide {
  return {
    id: "scene-1",
    title: "Treadmill",
    prompt: "Stormi works out",
    references: [
      { id: "ref-actor", kind: "subject", storageUrl: "https://cdn.example/actor.jpg", storagePath: "actor" },
    ],
  } as ShootGuide;
}

function shot(id: string, title: string): ShootGuideShot {
  return {
    id,
    shotNumber: 1,
    title,
    purpose: `${title} purpose`,
    framing: "MCU",
    lens: "75mm",
    cameraAngle: "eye level",
    movement: "push in",
    lightingChanges: "side light",
    duration: "4s",
    specialRequirements: "keep hair",
    status: "planned",
    takeRecords: [],
    visualAssets: [
      {
        id: "still-1",
        sceneId: "scene-1",
        shotId: id,
        type: "ai_still",
        status: "ready",
        storageUrl: "https://cdn.example/still.jpg",
        storagePath: "still",
        createdAt: "2026-09-24T00:00:00.000Z",
        provider: "runway",
        prompt: null,
      },
    ],
  };
}

describe("scene builder handoff", () => {
  it("copies only selected shots and keeps a source link", () => {
    const result = mergeSceneShotsIntoDays([], guide(), [shot("shot-a", "Gaze")]);
    expect(result.created).toBe(1);
    expect(result.days[0].shots).toHaveLength(1);
    const copied = result.days[0].shots[0];
    expect(copied.sourceSceneId).toBe("scene-1");
    expect(copied.sourceShotId).toBe("shot-a");
    expect(copied.framing).toBe("MCU");
    expect(copied.lens).toBe("75mm");
    expect(copied.cameraAngle).toBe("eye level");
    expect(copied.productionStatus).toBe("planned");
    expect(copied.referenceImageUrl).toBe("https://cdn.example/still.jpg");
    expect(copied.media?.some((item) => item.role === "ai_previs")).toBe(true);
    expect(copied.media?.some((item) => item.label === "subject")).toBe(true);
    expect(sceneShotKey("scene-1", "shot-a")).toBe("scene-1:shot-a");
  });

  it("updates the same source shot instead of duplicating it", () => {
    const first = mergeSceneShotsIntoDays([], guide(), [shot("shot-a", "Gaze")]);
    first.days[0].shots[0].productionStatus = "shot";
    first.days[0].shots[0].notes = "Director changed the mark";
    first.days[0].shots[0].media = [
      ...(first.days[0].shots[0].media ?? []),
      { id: "take-1", role: "captured_footage", url: "https://cdn.example/take.mp4", label: "Take 1" },
    ];
    const revised = shot("shot-a", "Gaze tighter");
    revised.framing = "CU";
    const second = mergeSceneShotsIntoDays(first.days, guide(), [revised]);
    expect(second.created).toBe(0);
    expect(second.updated).toBe(1);
    expect(second.days[0].shots).toHaveLength(1);
    expect(second.days[0].shots[0].label).toBe("Gaze tighter");
    expect(second.days[0].shots[0].framing).toBe("CU");
    expect(second.days[0].shots[0].productionStatus).toBe("shot");
    expect(second.days[0].shots[0].notes).toBe("Director changed the mark");
    expect(second.days[0].shots[0].media?.some((item) => item.role === "captured_footage")).toBe(true);
  });

  it("adds a later shot onto the same day", () => {
    const days: ProductionDay[] = mergeSceneShotsIntoDays([], guide(), [shot("shot-a", "Gaze")]).days;
    const next = mergeSceneShotsIntoDays(days, guide(), [shot("shot-b", "Feet")]);
    expect(next.created).toBe(1);
    expect(next.days[0].shots.map((item) => item.sourceShotId)).toEqual(["shot-a", "shot-b"]);
  });

  it("updates planning fields and keeps production status, notes, and captured footage", () => {
    const days = mergeSceneShotsIntoDays([], guide(), [shot("shot-a", "Gaze")]).days;
    days[0].shots[0].productionStatus = "shot";
    days[0].shots[0].notes = "On-set note";
    days[0].shots[0].media = [
      ...(days[0].shots[0].media ?? []),
      { id: "take-1", role: "captured_footage", url: "https://cdn.example/take.mp4" },
    ];
    const revised = shot("shot-a", "Gaze");
    revised.framing = "CU";
    revised.lens = "50mm";
    revised.specialRequirements = "new note";
    const scene = guide();
    scene.shots = [revised];
    const result = refreshLinkedShots(days, [scene]);
    const synced = result.days[0].shots[0];
    expect(result.updated).toEqual([synced.id]);
    expect(synced.framing).toBe("CU");
    expect(synced.lens).toBe("50mm");
    expect(synced.sceneNotes).toBe("new note");
    expect(synced.notes).toBe("On-set note");
    expect(synced.productionStatus).toBe("shot");
    expect(synced.media?.some((item) => item.url === "https://cdn.example/take.mp4")).toBe(true);
    expect(synced.sourceSyncedAt).toBeTruthy();
  });

  it("keeps a production shot when the source shot is gone", () => {
    const days = mergeSceneShotsIntoDays([], guide(), [shot("shot-a", "Gaze"), shot("shot-b", "Feet")]).days;
    const scene = guide();
    scene.shots = [shot("shot-a", "Gaze")];
    const result = refreshLinkedShots(days, [scene]);
    expect(result.days[0].shots).toHaveLength(2);
    expect(result.missing).toHaveLength(1);
    expect(result.days[0].shots[1].sourceUnavailable).toBe(true);
    expect(result.days[0].shots[1].label).toBe("Feet");
  });

  it("reports an unchanged shot as current", () => {
    const days = mergeSceneShotsIntoDays([], guide(), [shot("shot-a", "Gaze")]).days;
    const scene = guide();
    scene.shots = [shot("shot-a", "Gaze")];
    const result = refreshLinkedShots(days, [scene], { productionShotId: days[0].shots[0].id });
    expect(result.current).toEqual([days[0].shots[0].id]);
    expect(result.updated).toEqual([]);
    expect(result.days[0].shots[1]).toBeUndefined();
  });
});
