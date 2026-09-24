import RunwayML from "@runwayml/sdk";
import { motionModel, stillModel } from "./cost";
import type {
  VisualGenerationProvider,
  VisualMotionRequest,
  VisualStillRequest,
  VisualTask,
} from "./types";

function client(): RunwayML {
  const apiKey = process.env.RUNWAYML_API_SECRET;
  if (!apiKey) throw new Error("RUNWAYML_API_SECRET is not configured");
  return new RunwayML({ apiKey });
}

function pendingTask(task: {
  id: string;
  model: string;
  estimatedCredits?: number | null;
}): VisualTask {
  return {
    provider: "runway",
    taskId: task.id,
    model: task.model,
    status: "pending",
    outputUrl: null,
    error: null,
    estimatedCredits: task.estimatedCredits ?? null,
    actualCredits: null,
  };
}

export const runwayProvider: VisualGenerationProvider = {
  id: "runway",

  async generateStill(input: VisualStillRequest): Promise<VisualTask> {
    const choice = stillModel(input.referenceImages.length);
    const runway = client();
    if (choice.model === "gen4_image_turbo") {
      const created = await runway.textToImage.create({
        model: "gen4_image_turbo",
        promptText: input.prompt,
        ratio: "1280:720",
        referenceImages: input.referenceImages.map((image) => ({ uri: image.uri, tag: image.tag })),
      });
      return pendingTask({
        id: created.id,
        model: choice.model,
        estimatedCredits: created.estimatedCost?.credits ?? choice.credits,
      });
    }
    const created = await runway.textToImage.create({
      model: "gen4_image",
      promptText: input.prompt,
      ratio: "1280:720",
      referenceImages: input.referenceImages.length
        ? input.referenceImages.map((image) => ({ uri: image.uri, tag: image.tag }))
        : undefined,
    });
    return pendingTask({
      id: created.id,
      model: choice.model,
      estimatedCredits: created.estimatedCost?.credits ?? choice.credits,
    });
  },

  async generateMotion(input: VisualMotionRequest): Promise<VisualTask> {
    const choice = motionModel(input.quality, input.durationSeconds);
    const runway = client();
    if (choice.model === "gen4.5") {
      const created = await runway.imageToVideo.create({
        model: "gen4.5",
        promptImage: input.startFrameUrl,
        promptText: input.prompt,
        ratio: "1280:720",
        duration: input.durationSeconds,
      });
      return pendingTask({
        id: created.id,
        model: choice.model,
        estimatedCredits: created.estimatedCost?.credits ?? choice.credits,
      });
    }
    const created = await runway.imageToVideo.create({
      model: "gen4_turbo",
      promptImage: input.startFrameUrl,
      promptText: input.prompt,
      ratio: "1280:720",
      duration: input.durationSeconds,
    });
    return pendingTask({
      id: created.id,
      model: choice.model,
      estimatedCredits: created.estimatedCost?.credits ?? choice.credits,
    });
  },

  async getTaskStatus(taskId: string): Promise<VisualTask> {
    const task = await client().tasks.retrieve(taskId);
    const base = {
      provider: "runway",
      taskId: task.id,
      model: "",
      estimatedCredits: "estimatedCost" in task ? task.estimatedCost?.credits ?? null : null,
      actualCredits: "cost" in task ? task.cost?.credits ?? null : null,
    };
    if (task.status === "SUCCEEDED") {
      return {
        ...base,
        status: "ready",
        outputUrl: task.output?.[0] ?? null,
        error: null,
      };
    }
    if (task.status === "FAILED" || task.status === "CANCELLED") {
      return {
        ...base,
        status: "failed",
        outputUrl: null,
        error: task.status === "FAILED" ? task.failure || "Generation failed" : "Generation was cancelled",
      };
    }
    return {
      ...base,
      status: "pending",
      outputUrl: null,
      error: null,
    };
  },
};

export function getVisualProvider(): VisualGenerationProvider {
  return runwayProvider;
}
