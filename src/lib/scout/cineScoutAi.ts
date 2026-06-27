import {
  ScoutDpPlan,
  ScoutLocationAnalysis,
  ScoutPreview,
  ScoutProject,
  ScoutProjectImage,
  ScoutShotList,
  ScoutShotListItem,
} from "@/lib/scout/types";
import {
  mockDpPlan,
  mockLocationAnalysis,
  mockPreviews,
  mockShotList,
} from "@/lib/scout/mockAi";
import {
  buildCinematicFramePromptRequest,
  buildDpPlanUserPrompt,
  buildLightingDiagramImagePromptRequest,
  buildLocationAnalysisUserPrompt,
  buildShotListUserPrompt,
  CINESCOUT_SYSTEM_PROMPT,
} from "@/lib/scout/prompts/buildPrompts";
import { CINESCOUT_ON_SET_WORKFLOW } from "@/lib/scout/prompts/cineScoutSystem";
import {
  callGeminiGenerate,
  callGeminiGenerateImage,
  callGeminiJsonText,
  callGeminiJsonWithImages,
  fetchImageInlineData,
  scoutGeminiImageGenEnabled,
} from "@/lib/scout/geminiClient";
import {
  formatOpenAiImageError,
  generateOpenAiImage,
  generateOpenAiImageFromReference,
} from "@/lib/scout/openaiImages";
import {
  scoutImageProvider,
  scoutImageQuality,
  scoutMaxCinematicPrevis,
  scoutScenePrevisCount,
  scoutScenePrevisCap,
  scoutScenePrevisForAllShots,
  scoutUseOpenAiForImages,
} from "@/lib/scout/imageConfig";
import { resizeScoutPreviewImage } from "@/lib/scout/imageResize";

import { vertexGeminiAvailable } from "@/lib/scout/geminiVertex";

export function scoutAiUsesMock(): boolean {
  if (process.env.SCOUT_USE_MOCK_AI === "true") return true;
  const hasGemini =
    Boolean(process.env.GEMINI_API_KEY?.trim()) || vertexGeminiAvailable();
  if (process.env.SCOUT_USE_MOCK_AI === "false" && hasGemini) return false;
  return !hasGemini;
}

export type ScoutPreviewDraft = Omit<ScoutPreview, "createdAt"> & {
  imageBuffer?: Buffer;
  imageContentType?: "image/jpeg" | "image/png";
};

/** Fixed overall scene angles — not tied 1:1 to shot list rows. */
const OVERALL_SCENE_PREVIS: Array<{ suffix: string; label: string }> = [
  { suffix: "overall-master", label: "Master wide — full scene" },
  { suffix: "overall-medium", label: "Medium — room & blocking" },
  { suffix: "overall-mood", label: "Mood / detail angle" },
];

function overallScenePrevisTargets(
  max: number
): Array<{ shot?: ScoutShotListItem; suffix: string; label: string }> {
  return OVERALL_SCENE_PREVIS.slice(0, max).map((t) => ({ ...t, shot: undefined }));
}

function cinematicPrevisTargets(
  shotList: ScoutShotList | undefined,
  max: number
): Array<{ shot?: ScoutShotListItem; suffix: string; label: string }> {
  if (scoutScenePrevisForAllShots() && shotList?.shots?.length) {
    return selectPrevisShots(shotList).map((s) => ({
      shot: s,
      suffix: `shot-${s.shotNumber}`,
      label: shotLabel(s),
    }));
  }
  return overallScenePrevisTargets(max);
}

function selectPrevisShots(shotList?: ScoutShotList): ScoutShotListItem[] {
  if (!shotList?.shots?.length) return [];

  if (scoutScenePrevisForAllShots()) {
    return shotList.shots.slice(0, scoutScenePrevisCap());
  }

  const cap = scoutMaxCinematicPrevis();
  if (cap <= 0) return [];

  const pool =
    shotList.shots.filter((s) => s.priority === "must_have").length > 0
      ? shotList.shots.filter((s) => s.priority === "must_have")
      : shotList.shots;

  const preferredTypes = [
    "master_wide",
    "medium_shot",
    "close_up",
    "insert_shot",
    "movement_shot",
    "reaction_shot",
  ];
  const picked: ScoutShotListItem[] = [];
  for (const type of preferredTypes) {
    const match = pool.find((s) => s.shotType === type && !picked.includes(s));
    if (match) picked.push(match);
    if (picked.length >= cap) break;
  }
  for (const s of pool) {
    if (picked.length >= cap) break;
    if (!picked.includes(s)) picked.push(s);
  }
  return picked.slice(0, cap);
}

export async function cineScoutAnalyzeLocation(
  project: ScoutProject,
  images: ScoutProjectImage[]
): Promise<Omit<ScoutLocationAnalysis, "id" | "createdAt">> {
  if (scoutAiUsesMock()) {
    return mockLocationAnalysis(project.id, images);
  }

  const userPrompt = buildLocationAnalysisUserPrompt(project, images);
  const imageUrls = images.map((img) => img.storageUrl);
  const parsed = (await callGeminiJsonWithImages(
    CINESCOUT_SYSTEM_PROMPT,
    userPrompt,
    imageUrls
  )) as Omit<ScoutLocationAnalysis, "id" | "createdAt">;

  if (!parsed.perImage?.length || !parsed.bestAngle?.bestImageId) {
    throw new Error("Invalid location analysis JSON from CineScout AI");
  }
  return parsed;
}

export async function cineScoutGenerateDpPlan(
  project: ScoutProject,
  analysis: ScoutLocationAnalysis,
  fixtures: import("./types").LightFixture[] = []
): Promise<Omit<ScoutDpPlan, "id" | "createdAt">> {
  if (scoutAiUsesMock()) {
    return mockDpPlan(project, analysis, fixtures);
  }

  const userPrompt = buildDpPlanUserPrompt(project, JSON.stringify(analysis));
  const parsed = (await callGeminiJsonText(CINESCOUT_SYSTEM_PROMPT, userPrompt)) as Omit<
    ScoutDpPlan,
    "id" | "createdAt"
  >;

  if (!parsed.blockingPlan || !parsed.lightingPlan || !parsed.cameraSettings) {
    throw new Error("Invalid DP plan JSON from CineScout AI");
  }
  if (!parsed.onSetWorkflow?.length) {
    parsed.onSetWorkflow = [...CINESCOUT_ON_SET_WORKFLOW];
  }
  return parsed;
}

export async function cineScoutGenerateShotList(
  project: ScoutProject,
  dpPlan: ScoutDpPlan
): Promise<Omit<ScoutShotList, "id" | "createdAt" | "updatedAt">> {
  if (scoutAiUsesMock()) {
    return mockShotList(project, dpPlan);
  }

  const userPrompt = buildShotListUserPrompt(project, JSON.stringify(dpPlan));
  const parsed = (await callGeminiJsonText(CINESCOUT_SYSTEM_PROMPT, userPrompt)) as {
    shots: ScoutShotList["shots"];
  };

  if (!parsed.shots?.length) throw new Error("Invalid shot list JSON from CineScout AI");
  return { shots: parsed.shots };
}

async function buildLightingDiagramPrompt(
  project: ScoutProject,
  dpPlan: ScoutDpPlan,
  referenceImage: ScoutProjectImage
): Promise<string> {
  const request = buildLightingDiagramImagePromptRequest(project, JSON.stringify(dpPlan));
  const inline = await fetchImageInlineData(referenceImage.storageUrl);
  if (!inline) {
    throw new Error("Could not load the uploaded location photo for diagram generation");
  }

  return callGeminiGenerate({
    systemPrompt: CINESCOUT_SYSTEM_PROMPT,
    userParts: [{ text: request }, { inlineData: inline }],
    temperature: 0.5,
  });
}

async function buildCinematicPrompt(
  project: ScoutProject,
  dpPlan: ScoutDpPlan,
  referenceImage: ScoutProjectImage,
  shot?: ScoutShotListItem,
  overallViewLabel?: string
): Promise<string> {
  const request = buildCinematicFramePromptRequest(
    project,
    JSON.stringify(dpPlan),
    shot
      ? {
          shotNumber: shot.shotNumber,
          shotType: shot.shotType,
          subjectAction: shot.subjectAction,
          lens: shot.lens,
          cameraMovement: shot.cameraMovement,
          lightingNotes: shot.lightingNotes,
          shotName: shot.shotName,
        }
      : undefined,
    overallViewLabel
  );
  const inline = await fetchImageInlineData(referenceImage.storageUrl);
  if (!inline) {
    throw new Error("Could not load the uploaded location photo for cinematic previs");
  }

  return callGeminiGenerate({
    systemPrompt: CINESCOUT_SYSTEM_PROMPT,
    userParts: [{ text: request }, { inlineData: inline }],
    temperature: 0.6,
  });
}

type ImageGenResult = { buffer?: Buffer; contentType?: "image/jpeg" | "image/png"; error?: string };

async function finalizeImageBuffer(buffer: Buffer): Promise<Pick<ImageGenResult, "buffer" | "contentType">> {
  const resized = await resizeScoutPreviewImage(buffer);
  return { buffer: resized.buffer, contentType: resized.contentType };
}

async function generateDiagramImage(
  prompt: string,
  aspectRatio?: string
): Promise<ImageGenResult> {
  const errors: string[] = [];
  const quality = scoutImageQuality();
  const provider = scoutImageProvider();

  const tryVertex = async (): Promise<Buffer> => {
    if (!scoutGeminiImageGenEnabled()) {
      throw new Error("Vertex/Gemini image generation is not configured (FIREBASE_SERVICE_ACCOUNT_JSON)");
    }
    return callGeminiGenerateImage({ prompt, aspectRatio });
  };

  const tryOpenAi = async (): Promise<Buffer> => {
    if (!scoutUseOpenAiForImages()) {
      throw new Error("OpenAI image generation is disabled (SCOUT_IMAGE_PROVIDER=vertex)");
    }
    return generateOpenAiImage(prompt, { aspectRatio, quality });
  };

  if (provider === "vertex") {
    try {
      const { buffer, contentType } = await finalizeImageBuffer(await tryVertex());
      return { buffer, contentType };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Vertex diagram image failed";
      console.error("Vertex diagram image failed:", message);
      return { error: message };
    }
  }

  if (provider === "openai") {
    try {
      const { buffer, contentType } = await finalizeImageBuffer(await tryOpenAi());
      return { buffer, contentType };
    } catch (err) {
      return { error: formatOpenAiImageError(err) };
    }
  }

  // auto: OpenAI first, then Vertex
  if (scoutUseOpenAiForImages()) {
    try {
      const { buffer, contentType } = await finalizeImageBuffer(await tryOpenAi());
      return { buffer, contentType };
    } catch (err) {
      errors.push(formatOpenAiImageError(err));
      console.error("OpenAI diagram image failed:", errors[errors.length - 1]);
    }
  }

  try {
    const { buffer, contentType } = await finalizeImageBuffer(await tryVertex());
    return { buffer, contentType };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Vertex diagram image failed";
    errors.push(message);
    console.error("Vertex diagram image failed:", message);
  }

  return {
    error:
      errors.join(" · ") ||
      "Diagram unavailable — set FIREBASE_SERVICE_ACCOUNT_JSON (Vertex) or OPENAI_API_KEY.",
  };
}

async function generateCinematicImage(
  prompt: string,
  referenceImage: ScoutProjectImage,
  aspectRatio?: string
): Promise<ImageGenResult> {
  if (!scoutUseOpenAiForImages() && !scoutGeminiImageGenEnabled()) {
    return {
      error:
        "Scene previs requires OPENAI_API_KEY or Vertex AI (FIREBASE_SERVICE_ACCOUNT_JSON) for image generation.",
    };
  }

  const inline = await fetchImageInlineData(referenceImage.storageUrl);
  if (!inline) {
    return { error: "Could not load your uploaded location photo for scene previs." };
  }
  const refBuffer = Buffer.from(inline.data, "base64");
  const errors: string[] = [];

  if (scoutUseOpenAiForImages()) {
    try {
      const { buffer, contentType } = await finalizeImageBuffer(
        await generateOpenAiImageFromReference(prompt, refBuffer, inline.mimeType, {
          aspectRatio,
          inputFidelity: "high",
          quality: scoutImageQuality(),
        })
      );
      return { buffer, contentType };
    } catch (err) {
      const message = formatOpenAiImageError(err);
      errors.push(message);
      console.error("OpenAI cinematic previs failed:", message);
      try {
        const { buffer, contentType } = await finalizeImageBuffer(
          await generateOpenAiImage(prompt, { aspectRatio, quality: scoutImageQuality() })
        );
        return { buffer, contentType };
      } catch (fallbackErr) {
        errors.push(formatOpenAiImageError(fallbackErr));
      }
    }
  }

  if (scoutGeminiImageGenEnabled()) {
    try {
      const { buffer, contentType } = await finalizeImageBuffer(
        await callGeminiGenerateImage({
          prompt,
          referenceInline: inline,
          aspectRatio,
        })
      );
      return { buffer, contentType };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gemini scene previs failed";
      errors.push(message);
      console.error("Gemini cinematic previs failed:", message);
    }
  }

  return { error: errors.join(" · ") || "Scene image generation failed" };
}

function shotLabel(shot: ScoutShotListItem): string {
  if (shot.shotName?.trim()) return shot.shotName.trim();
  return `Shot ${shot.shotNumber} — ${shot.shotType.replace(/_/g, " ")}`;
}

export async function cineScoutGeneratePreviews(
  project: ScoutProject,
  dpPlan: ScoutDpPlan,
  images: ScoutProjectImage[] = [],
  shotList?: ScoutShotList
): Promise<ScoutPreviewDraft[]> {
  if (scoutAiUsesMock()) {
    return mockPreviews(project, dpPlan);
  }

  const referenceImage =
    images.find((img) => img.id === project.bestImageId) ??
    images.find((img) => img.selectedAsBest) ??
    images[0];

  if (!referenceImage) {
    throw new Error("Upload at least one location photo before generating previs");
  }

  const previews: ScoutPreviewDraft[] = [];

  // 1) Top-down lighting diagram (schematic)
  const diagramPrompt = await buildLightingDiagramPrompt(project, dpPlan, referenceImage);
  const diagramResult = await generateDiagramImage(diagramPrompt, project.aspectRatio);
  previews.push({
    id: `preview-${project.id}-diagram`,
    prompt: diagramPrompt,
    type: "lighting_diagram",
    shotLabel: "Top-down lighting plan",
    ...(diagramResult.buffer ? { imageBuffer: diagramResult.buffer } : {}),
    ...(diagramResult.contentType ? { imageContentType: diagramResult.contentType } : {}),
    ...(diagramResult.error ? { imageGenerationError: diagramResult.error } : {}),
  });

  // 2) Overall scene previs — 3 wide/medium/mood views (not one image per shot list row)
  const maxScenePrevis = scoutScenePrevisCount(shotList?.shots?.length ?? 0);
  if (maxScenePrevis > 0) {
    const cinematicTargets = cinematicPrevisTargets(shotList, maxScenePrevis);

    for (const target of cinematicTargets) {
      const cinematicPrompt = await buildCinematicPrompt(
        project,
        dpPlan,
        referenceImage,
        target.shot,
        target.shot ? undefined : target.label
      );
      const cinematicResult = await generateCinematicImage(
        cinematicPrompt,
        referenceImage,
        project.aspectRatio
      );
      previews.push({
        id: `preview-${project.id}-${target.suffix}`,
        prompt: cinematicPrompt,
        type: "cinematic_frame",
        shotNumber: target.shot?.shotNumber,
        shotLabel: target.label,
        ...(cinematicResult.buffer ? { imageBuffer: cinematicResult.buffer } : {}),
        ...(cinematicResult.contentType ? { imageContentType: cinematicResult.contentType } : {}),
        ...(cinematicResult.error ? { imageGenerationError: cinematicResult.error } : {}),
      });
    }
  }

  return previews;
}
