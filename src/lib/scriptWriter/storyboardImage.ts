import { randomUUID } from "crypto";
import {
  callGeminiGenerateImage,
  fetchImageInlineData,
  geminiImageGenEnabled,
} from "@/lib/ai/geminiClient";
import { aiUsesMock } from "@/lib/ai/mockAi";
import { uploadImageBufferToPath } from "@/lib/production/adminStorage";
import { formatShotTypeLabel } from "@/lib/production/shotLabels";
import type {
  ScriptDocument,
  ScriptInspirationImage,
  ScriptStoryboardFrame,
  ScriptStoryboardImage,
} from "@/lib/scriptWriter/types";

// Re-export the client-safe cost constant so server callers can use it here too.
export { STORYBOARD_IMAGE_COST_USD } from "@/lib/scriptWriter/storyboardCost";

function line(label: string, value?: string): string | null {
  const v = value?.trim();
  return v ? `${label}: ${v}` : null;
}

/**
 * Build a photorealistic cinematic film-still prompt from a storyboard frame,
 * grounded in the script's story, look, and genre. Asks for a single frame.
 */
export function buildStoryboardFramePrompt(
  frame: ScriptStoryboardFrame,
  script: ScriptDocument
): string {
  const meta = [
    line("Scene", frame.sceneHeading),
    line("Shot", frame.shotType ? formatShotTypeLabel(frame.shotType) : undefined),
    line("Story", script.logline),
    line("Genre", script.genre),
    line("Look & feel", script.lookAndFeel),
  ].filter(Boolean);

  return [
    "Generate ONE photorealistic cinematic film still for a storyboard frame.",
    "It should look like a frame grab from a finished film: realistic lighting, real lenses, natural skin and textures, grounded production design.",
    "Single image only — no collage, no split panels, no borders, no UI chrome, no watermarks, no text, no captions, and no letterboxing bars with text.",
    "",
    `What we see: ${frame.caption}`,
    ...(meta.length ? ["", "Context:", ...meta] : []),
    "",
    "Match the described framing, mood, and lighting. Keep it photoreal and cinematic.",
  ].join("\n");
}

/** Storyboard frames are 16:9 unless the shot is clearly vertical / social. */
export function storyboardAspectRatio(frame: ScriptStoryboardFrame): "16:9" | "9:16" {
  const type = (frame.shotType ?? "").toLowerCase();
  if (type.includes("vertical") || type.includes("social") || type.includes("reel")) {
    return "9:16";
  }
  return "16:9";
}

function mockFrameSvg(frame: ScriptStoryboardFrame): Buffer {
  const clean = (s: string) => s.replace(/[<>&"]/g, "").slice(0, 120);
  const title = clean(
    frame.shotName?.trim() || `Scene ${frame.sceneNumber} · ${formatShotTypeLabel(frame.shotType)}`
  );
  const caption = clean(frame.caption || "AI storyboard frame (mock)");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#334155"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="720" fill="url(#g)"/>
  <text x="640" y="320" fill="#e2e8f0" font-family="Georgia, serif" font-size="34" text-anchor="middle">${title}</text>
  <text x="640" y="380" fill="#cbd5e1" font-family="system-ui, sans-serif" font-size="20" text-anchor="middle">${caption}</text>
  <text x="640" y="660" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="14" text-anchor="middle">Mock storyboard frame · enable Gemini image model for photoreal stills</text>
</svg>`;
  return Buffer.from(svg, "utf8");
}

/**
 * Generate a photoreal storyboard still for one script scene and upload it to
 * Storage under the session's folder. Uses the matched inspiration image as a
 * style reference when available.
 */
export async function generateStoryboardFrameImage(params: {
  sessionId: string;
  frame: ScriptStoryboardFrame;
  script: ScriptDocument;
  inspirationImages?: ScriptInspirationImage[];
}): Promise<ScriptStoryboardImage> {
  const { sessionId, frame, script } = params;
  const inspirationImages = params.inspirationImages ?? [];
  const prompt = buildStoryboardFramePrompt(frame, script);
  const aspectRatio = storyboardAspectRatio(frame);
  const assetId = randomUUID();
  const basePath = `scriptWriter/${sessionId}/storyboard`;

  if (aiUsesMock() || !geminiImageGenEnabled()) {
    if (!aiUsesMock() && !geminiImageGenEnabled()) {
      throw new Error(
        "AI image generation is not configured. Set GEMINI_API_KEY (or a Vertex image model), or SCOUT_USE_MOCK_AI=true for placeholders."
      );
    }
    const uploaded = await uploadImageBufferToPath({
      path: `${basePath}/${assetId}.svg`,
      buffer: mockFrameSvg(frame),
      contentType: "image/svg+xml",
    });
    return {
      url: uploaded.storageUrl,
      storagePath: uploaded.storagePath,
      prompt,
      createdAt: new Date().toISOString(),
    };
  }

  // Use the matched inspiration image as a style reference when present.
  const refUrl = frame.inspirationImageId
    ? inspirationImages.find((i) => i.id === frame.inspirationImageId)?.storageUrl?.trim()
    : undefined;
  const referenceInline = refUrl ? (await fetchImageInlineData(refUrl)) ?? undefined : undefined;

  const buffer = await callGeminiGenerateImage({
    prompt,
    aspectRatio,
    ...(referenceInline ? { referenceInline } : {}),
  });

  const uploaded = await uploadImageBufferToPath({
    path: `${basePath}/${assetId}.png`,
    buffer,
    contentType: "image/png",
  });

  return {
    url: uploaded.storageUrl,
    storagePath: uploaded.storagePath,
    prompt,
    createdAt: new Date().toISOString(),
  };
}
