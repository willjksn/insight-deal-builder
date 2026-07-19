import { describe, expect, it } from "vitest";
import { migrateSceneFramesOntoShots } from "@/lib/production/coverageMigrate";
import type { ProductionDayShot, ProductionSceneFrame } from "@/lib/production/types";

describe("migrateSceneFramesOntoShots", () => {
  it("copies scene frame image onto first empty shot in scene", () => {
    const shots: ProductionDayShot[] = [
      {
        id: "a",
        label: "1. Wide",
        sceneRef: "1",
        done: false,
        sortOrder: 0,
        shotType: "master_wide",
      },
      {
        id: "b",
        label: "2. CU",
        sceneRef: "1",
        done: false,
        sortOrder: 1,
        shotType: "close_up",
      },
    ];
    const frames: ProductionSceneFrame[] = [
      {
        id: "f1",
        sceneRef: "1",
        caption: "Hero wide",
        sortOrder: 0,
        referenceImageUrl: "https://example.com/wide.jpg",
        referenceImageSource: "upload",
      },
    ];

    const { shots: next, migrated } = migrateSceneFramesOntoShots(shots, frames);
    expect(migrated).toBe(1);
    expect(next[0].referenceImageUrl).toBe("https://example.com/wide.jpg");
    expect(next[0].referenceImageSource).toBe("scene_migrate");
    expect(next[0].description).toBe("Hero wide");
    expect(next[1].referenceImageUrl).toBeUndefined();
  });

  it("does not overwrite existing shot images", () => {
    const shots: ProductionDayShot[] = [
      {
        id: "a",
        label: "1. Wide",
        sceneRef: "1",
        done: false,
        sortOrder: 0,
        shotType: "master_wide",
        referenceImageUrl: "https://example.com/keep.jpg",
        referenceImageSource: "upload",
      },
    ];
    const frames: ProductionSceneFrame[] = [
      {
        id: "f1",
        sceneRef: "1",
        sortOrder: 0,
        referenceImageUrl: "https://example.com/new.jpg",
      },
    ];

    const { shots: next, migrated } = migrateSceneFramesOntoShots(shots, frames);
    expect(migrated).toBe(0);
    expect(next[0].referenceImageUrl).toBe("https://example.com/keep.jpg");
  });
});
