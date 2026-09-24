export type VisualQuality = "fast" | "high";

export type VisualTaskStatus = "pending" | "ready" | "failed";

export interface VisualReferenceImage {
  uri: string;
  tag: string;
}

export interface VisualStillRequest {
  prompt: string;
  referenceImages: VisualReferenceImage[];
}

export interface VisualMotionRequest {
  prompt: string;
  startFrameUrl: string;
  durationSeconds: number;
  quality: VisualQuality;
}

export interface VisualTask {
  provider: string;
  taskId: string;
  model: string;
  status: VisualTaskStatus;
  outputUrl: string | null;
  error: string | null;
  estimatedCredits: number | null;
  actualCredits: number | null;
}

export interface VisualGenerationProvider {
  id: string;
  generateStill(input: VisualStillRequest): Promise<VisualTask>;
  generateMotion(input: VisualMotionRequest): Promise<VisualTask>;
  getTaskStatus(taskId: string): Promise<VisualTask>;
}
