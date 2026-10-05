import { describe, expect, it } from "vitest";
import { applyTaskToAsset } from "./runJob";
import { creditsToUsd, formatApproxCost, motionModel, stillModel } from "./cost";
import { providerLimits } from "./providerLimits";
import { buildMotionPrompt, buildStillPrompt, motionDurationSeconds, selectReferenceImages } from "./prompts";

describe("generation cost", () => {
  it("prices a reference still cheaper than a text-only still", () => {
    expect(stillModel(2)).toEqual({ model: "gen4_image_turbo", credits: 2 });
    expect(stillModel(0)).toEqual({ model: "gen4_image", credits: 5 });
    expect(formatApproxCost(2)).toBe("Approx. $0.02");
    expect(creditsToUsd(5)).toBe(0.05);
  });

  it("prices draft motion cheaper than the 1080p quality model", () => {
    expect(motionModel("fast", 5)).toEqual({ model: "gen4_turbo", credits: 25, duration: 5 });
    expect(motionModel("high", 5)).toEqual({ model: "veo3.1", credits: 80, duration: 4 });
    expect(motionModel("high", 8)).toEqual({ model: "veo3.1", credits: 160, duration: 8 });
    expect(formatApproxCost(25)).toBe("Approx. $0.25");
    expect(formatApproxCost(80)).toBe("Approx. $0.80");
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
      {
        title: "Close up",
        purpose: "Show effort",
        framing: "CU",
        lens: "75mm",
        cameraAngle: "eye level",
        movement: "push in",
        lightingChanges: "side light",
      },
      refs,
      providerLimits.runway.stillPromptMaxCharacters
    );
    expect(prompt).toContain("@actor");
    expect(prompt).toContain("@location");
    expect(prompt).toContain("Stormi on the treadmill");
    expect(prompt).toContain("Lighting intent: side light");
    expect(prompt).toContain("Framing: CU");
    expect(prompt).toContain("Lens/look: 75mm");
    expect(prompt).toContain("Preserve the referenced actor exactly");
    expect(prompt).not.toContain("WARDROBE:");
    expect(prompt.length).toBeLessThanOrEqual(1000);
  });

  it("omits empty shot fields and includes wardrobe only when that reference exists", () => {
    const prompt = buildStillPrompt(
      { prompt: "" },
      { title: "Wide", purpose: "", framing: "", movement: "" },
      [{ uri: "https://cdn.example/clothes.jpg", tag: "wardrobe" }],
      providerLimits.runway.stillPromptMaxCharacters
    );
    expect(prompt).toContain("Shot description: Wide");
    expect(prompt).toContain("WARDROBE @wardrobe");
    expect(prompt).not.toContain("Framing:");
    expect(prompt).not.toContain("Camera movement intent:");
    expect(prompt).not.toContain("Scene description:");
  });

  it("builds motion from the shot and locks the camera when no move is set", () => {
    expect(motionDurationSeconds({ duration: "" })).toBe(4);
    expect(motionDurationSeconds({ duration: "8s" })).toBe(8);
    const prompt = buildMotionPrompt(
      { prompt: "Kitchen scene", outputType: "hybrid" },
      { title: "Fridge", purpose: "Opens the fridge", movement: "", duration: "" },
      { prompt: "old still prompt" },
      [{ uri: "https://cdn.example/actor.jpg", tag: "actor" }],
      4,
      providerLimits.runway.motionPromptMaxCharacters
    );
    expect(prompt).toContain("4 seconds");
    expect(prompt).toContain("Opens the fridge");
    expect(prompt).toContain("Locked and stable");
    expect(prompt).toContain("source image");
    expect(prompt).not.toContain("Kitchen scene");
    expect(prompt).not.toContain("old still prompt");
    expect(prompt).not.toContain("treadmill");
  });

  it("keeps the shot description when the provider limit drops lower-priority sections", () => {
    const prompt = buildStillPrompt(
      { prompt: "Optional scene context ".repeat(40), creativeIntent: "moody grade ".repeat(20) },
      {
        title: "Hero looks back",
        purpose: "Holds still",
        framing: "medium close-up",
        cameraAngle: "low angle",
        lens: "85mm",
        movement: "slow push",
        lightingChanges: "window light",
        specialRequirements: "technical notes ".repeat(20),
      },
      [
        { uri: "https://cdn.example/actor.jpg", tag: "actor" },
        { uri: "https://cdn.example/room.jpg", tag: "location" },
      ],
      320
    );
    expect(prompt).toContain("Hero looks back");
    expect(prompt).toContain("medium close-up");
    expect(prompt).toContain("low angle");
    expect(prompt).toContain("@actor");
    expect(prompt.length).toBeLessThanOrEqual(320);
    expect(prompt).not.toContain("85mm");
    expect(prompt).not.toContain("moody grade");
  });

  it("omits reference rules when those references are missing", () => {
    const prompt = buildStillPrompt({ prompt: "A quiet room" }, { title: "Wide view" }, [], 1000);
    expect(prompt).toContain("Wide view");
    expect(prompt).not.toContain("SUBJECT");
    expect(prompt).not.toContain("ENVIRONMENT");
    expect(prompt).not.toContain("WARDROBE");
    expect(prompt).not.toMatch(/treadmill|horror hallway/i);
  });

  it("drops motion constraints before the action, move, and duration", () => {
    const prompt = buildMotionPrompt(
      { prompt: "Full scene description that should stay out" },
      { purpose: "Turns toward the window", movement: "slow push", duration: "4" },
      { prompt: "still prompt text" },
      [],
      4,
      220
    );
    expect(prompt).toContain("Turns toward the window");
    expect(prompt).toContain("slow push");
    expect(prompt).toContain("4 seconds");
    expect(prompt).not.toContain("warp the face");
    expect(prompt).not.toContain("Full scene description");
    expect(prompt).not.toContain("still prompt text");
    expect(prompt).not.toContain("treadmill");
    expect(prompt.length).toBeLessThanOrEqual(220);
  });
});
