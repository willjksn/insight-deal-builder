import { describe, expect, it } from "vitest";
import { applyTaskToAsset } from "./runJob";
import { creditsToUsd, formatApproxCost, motionModel, stillModel } from "./cost";
import { buildMotionPrompt, buildStillPrompt, motionDurationSeconds, selectReferenceImages } from "./prompts";

describe("generation cost", () => {
  it("prices a reference still cheaper than a text-only still", () => {
    expect(stillModel(2)).toEqual({ model: "gen4_image_turbo", credits: 2 });
    expect(stillModel(0)).toEqual({ model: "gen4_image", credits: 5 });
    expect(formatApproxCost(2)).toBe("Approx. $0.02");
    expect(creditsToUsd(5)).toBe(0.05);
  });

  it("prices five-second motion at the published per-second rates", () => {
    expect(motionModel("fast", 5)).toEqual({ model: "gen4_turbo", credits: 25 });
    expect(motionModel("high", 5)).toEqual({ model: "gen4.5", credits: 60 });
    expect(formatApproxCost(25)).toBe("Approx. $0.25");
  });
});

describe("failed generation", () => {
  it("keeps the prompt and marks the asset failed without touching planning fields", () => {
    const asset = applyTaskToAsset(
      {
        id: "asset-1",
        sceneId: "scene",
        shotId: "shot",
        type: "ai_still",
        provider: null,
        createdAt: "2026-09-23T00:00:00.000Z",
        storageUrl: null,
        storagePath: null,
        prompt: "Stormi on the treadmill",
        status: "pending",
      },
      {
        provider: "runway",
        taskId: "task-1",
        model: "gen4_image",
        status: "failed",
        outputUrl: null,
        error: "Runway rejected the request",
        estimatedCredits: 5,
        actualCredits: 0,
      }
    );
    expect(asset.status).toBe("failed");
    expect(asset.prompt).toBe("Stormi on the treadmill");
    expect(asset.provider).toBe("runway");
    expect(asset.providerTaskId).toBe("task-1");
    expect(asset.error).toBe("Runway rejected the request");
  });
});

describe("generation prompts", () => {
  it("mentions scene references and does not require a script", () => {
    const refs = selectReferenceImages({
      references: [
        { id: "1", kind: "subject", storageUrl: "https://cdn.example/actor.jpg", storagePath: "a" },
        { id: "2", kind: "location", storageUrl: "https://cdn.example/room.jpg", storagePath: "b" },
      ],
    });
    const prompt = buildStillPrompt(
      { title: "Workout", prompt: "Stormi on the treadmill", creativeIntent: "cinematic" },
      { title: "Close up", purpose: "Show effort", framing: "CU", movement: "push in", lightingChanges: "side light" },
      refs
    );
    expect(prompt).toContain("@actor");
    expect(prompt).toContain("@location");
    expect(prompt).toContain("Stormi on the treadmill");
    expect(prompt).toContain("side light");
  });

  it("defaults motion to five seconds", () => {
    expect(motionDurationSeconds({ duration: "" })).toBe(5);
    expect(motionDurationSeconds({ duration: "8s" })).toBe(8);
    const prompt = buildMotionPrompt({ prompt: "Kitchen scene" }, { purpose: "Opens the fridge", movement: "handheld", duration: "" });
    expect(prompt).toContain("5 seconds");
    expect(prompt).toContain("Opens the fridge");
  });
});
