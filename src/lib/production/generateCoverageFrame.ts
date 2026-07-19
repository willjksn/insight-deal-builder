import { randomUUID } from "crypto";
import {
  callGeminiGenerateImage,
  fetchImageInlineData,
  geminiImageGenEnabled,
} from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import { uploadProductionImageBuffer } from "@/lib/production/adminStorage";
import {
  buildCoverageFramePrompt,
  coverageFrameAspectRatio,
} from "@/lib/production/coverageFramePrompt";
import type {
  ProductionDayShot,
  ProductionInspirationImage,
} from "@/lib/production/types";

export type GeneratedCoverageFrame = {
  referenceImageUrl: string;
  referenceImageStoragePath: string;
  referenceImageSource: "ai_generate";
};

function mockStoryboardSvg(shot: ProductionDayShot): Buffer {
  const title = (shot.shotName || shot.label || "Shot").replace(/[<>&"]/g, "");
  const caption = (
    shot.description?.trim() ||
    shot.subjectAction?.trim() ||
    "AI frame (mock)"
  )
    .slice(0, 120)
    .replace(/[<>&"]/g, "");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#g)"/>
  <text x="640" y="320" fill="#e2e8f0" font-family="Georgia, serif" font-size="36" text-anchor="middle">${title}</text>
  <text x="640" y="380" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="20" text-anchor="middle">${caption}</text>
  <text x="640" y="660" fill="#64748b" font-family="system-ui, sans-serif" font-size="14" text-anchor="middle">Mock AI frame · enable Gemini image model for live stills</text>
</svg>`;
  return Buffer.from(svg, "utf8");
}

async function resolveReferenceInline(
  shot: ProductionDayShot,
  inspirationImages: ProductionInspirationImage[]
): Promise<{ mimeType: string; data: string } | undefined> {
  const fromInspiration = shot.inspirationImageId
    ? inspirationImages.find((i) => i.id === shot.inspirationImageId)?.imageUrl?.trim()
    : undefined;
  // Prefer library / upload refs for style — skip prior AI stills (avoid compounding).
  const uploadUrl =
    shot.referenceImageSource === "upload" || shot.referenceImageSource === "inspiration"
      ? shot.referenceImageUrl?.trim()
      : undefined;
  const url = fromInspiration || uploadUrl;
  if (!url) return undefined;
  const inline = await fetchImageInlineData(url);
  return inline ?? undefined;
}

/**
 * Generate a storyboard still for one coverage shot and upload to Storage.
 */
export async function generateCoverageFrameForShot(params: {
  projectId: string;
  shot: ProductionDayShot;
  inspirationImages?: ProductionInspirationImage[];
}): Promise<GeneratedCoverageFrame> {
  const { projectId, shot } = params;
  const inspirationImages = params.inspirationImages ?? [];
  const prompt = buildCoverageFramePrompt(shot);
  const aspectRatio = coverageFrameAspectRatio(shot);
  const assetId = randomUUID();

  if (aiUsesMock() || !geminiImageGenEnabled()) {
    if (!aiUsesMock() && !geminiImageGenEnabled()) {
      throw new Error(
        "AI frame generation is not configured. Set GEMINI_API_KEY or Vertex image model, or SCOUT_USE_MOCK_AI=true for placeholders."
      );
    }
    const buffer = mockStoryboardSvg(shot);
    const uploaded = await uploadProductionImageBuffer({
      projectId,
      folder: "storyboard",
      assetId,
      buffer,
      contentType: "image/svg+xml",
      ext: "svg",
    });
    return {
      referenceImageUrl: uploaded.storageUrl,
      referenceImageStoragePath: uploaded.storagePath,
      referenceImageSource: "ai_generate",
    };
  }

  const referenceInline = await resolveReferenceInline(shot, inspirationImages);
  const buffer = await callGeminiGenerateImage({
    prompt,
    aspectRatio,
    ...(referenceInline ? { referenceInline } : {}),
  });

  const uploaded = await uploadProductionImageBuffer({
    projectId,
    folder: "storyboard",
    assetId,
    buffer,
    contentType: "image/png",
    ext: "png",
  });

  return {
    referenceImageUrl: uploaded.storageUrl,
    referenceImageStoragePath: uploaded.storagePath,
    referenceImageSource: "ai_generate",
  };
}
