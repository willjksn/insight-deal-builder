import { describe, expect, it } from "vitest";
import type { ShotVisualAsset } from "./types";
import { latestPreviewAsset, resolveVisualStatus, shotVisualPrompt, statusAfterAsset } from "./visualAssets";

function asset(partial: Partial<ShotVisualAsset>): ShotVisualAsset {
  return {
    id: "a",
    sceneId: "scene",
    shotId: "shot",
    type: "storyboard",
    provider: "upload",
    createdAt: "2026-09-23T00:00:00.000Z",
    storageUrl: "https://example.com/frame.jpg",
    storagePath: "shoot-guide/u/g/shots/s/storyboard/a.jpg",
    prompt: "prompt",
    status: "ready",
    ...partial,
  };
}

describe("resolveVisualStatus", () => {
  it("keeps older shots planned unless they were already marked ready", () => {
    expect(resolveVisualStatus({ status: "planned" })).toBe("planned");
    expect(resolveVisualStatus({ status: "in_progress" })).toBe("planned");
    expect(resolveVisualStatus({ status: "ready" })).toBe("ready");
    expect(resolveVisualStatus({ status: "complete", visualStatus: "storyboarded" })).toBe("storyboarded");
  });
});

describe("statusAfterAsset", () => {
  it("advances only when a ready asset is a later stage", () => {
    expect(statusAfterAsset("planned", asset({ type: "storyboard" }))).toBe("storyboarded");
    expect(statusAfterAsset("storyboarded", asset({ type: "ai_still" }))).toBe("ai_previs");
    expect(statusAfterAsset("ai_previs", asset({ type: "real_footage" }))).toBe("real_footage");
    expect(statusAfterAsset("real_footage", asset({ type: "storyboard" }))).toBe("real_footage");
    expect(statusAfterAsset("ready", asset({ type: "storyboard" }))).toBe("ready");
    expect(statusAfterAsset("planned", asset({ status: "pending", storageUrl: null }))).toBe("planned");
  });
});

describe("latestPreviewAsset", () => {
  it("returns the newest ready file and ignores queued assets", () => {
    const older = asset({ id: "old", createdAt: "2026-09-01T00:00:00.000Z" });
    const newer = asset({ id: "new", type: "ai_still", createdAt: "2026-09-23T00:00:00.000Z" });
    const queued = asset({
      id: "wait",
      type: "ai_motion",
      status: "pending",
      storageUrl: null,
      createdAt: "2026-09-24T00:00:00.000Z",
    });
    expect(latestPreviewAsset([older, queued, newer])?.id).toBe("new");
    expect(latestPreviewAsset([queued])).toBeNull();
  });
});

describe("shotVisualPrompt", () => {
  it("uses the scene and shot without dropping empty fields", () => {
    const prompt = shotVisualPrompt(
      { title: "Workout", prompt: "Stormi on the treadmill", creativeIntent: "cinematic" },
      { title: "Close up", purpose: "Effort", framing: "CU", lens: "35mm", movement: "push in", duration: "4s" }
    );
    expect(prompt).toContain("Stormi on the treadmill");
    expect(prompt).toContain("Framing: CU");
    expect(prompt).toContain("Lens: 35mm");
  });
});
