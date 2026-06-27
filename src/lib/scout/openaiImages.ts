export function scoutImageGenEnabled(): boolean {
  if (process.env.SCOUT_USE_MOCK_AI === "true") return false;
  return Boolean(process.env.OPENAI_API_KEY);
}

export function scoutCinematicGenEnabled(): boolean {
  if (process.env.SCOUT_USE_MOCK_AI === "true") return false;
  return Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);
}

function scoutImageModel(): string {
  return process.env.SCOUT_IMAGE_MODEL ?? "gpt-image-1";
}

/** gpt-image-* sizes differ from legacy DALL-E (1792×1024 is invalid for gpt-image-1). */
function scoutImageSize(
  aspectRatio?: string,
  model?: string
): "1024x1024" | "1024x1536" | "1536x1024" | "1792x1024" | "1024x1792" {
  const m = model ?? scoutImageModel();
  if (m.startsWith("dall-e")) {
    if (aspectRatio === "9:16" || aspectRatio === "4:5") return "1024x1792";
    if (aspectRatio === "16:9" || aspectRatio === "2.39:1") return "1792x1024";
    return "1024x1024";
  }
  if (aspectRatio === "9:16" || aspectRatio === "4:5") return "1024x1536";
  if (aspectRatio === "16:9" || aspectRatio === "2.39:1") return "1536x1024";
  return "1024x1024";
}

function extensionForMime(mimeType: string): string {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

export function isOpenAiBillingLimitError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("billing_hard_limit") || msg.includes("Billing hard limit has been reached");
}

export function formatOpenAiImageError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (isOpenAiBillingLimitError(err)) {
    return "OpenAI billing limit reached — raise your spending limit at platform.openai.com/settings/organization/billing";
  }
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as { error?: { message?: string } };
      if (parsed.error?.message) return `OpenAI: ${parsed.error.message}`;
    }
  } catch {
    /* use raw */
  }
  return raw.length > 220 ? `${raw.slice(0, 220)}…` : raw;
}

async function fetchImageBufferFromUrl(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Failed to download OpenAI image URL (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

function extractB64FromOpenAiResponse(data: {
  data?: Array<{ b64_json?: string; url?: string }>;
}): Buffer {
  const item = data.data?.[0];
  if (item?.b64_json) return Buffer.from(item.b64_json, "base64");
  if (item?.url) throw new Error("OpenAI returned a URL — retry without URL-only models");
  throw new Error("OpenAI returned no image data");
}

/** Generate a PNG buffer from a text prompt via OpenAI Images API (no reference). */
export async function generateOpenAiImage(
  prompt: string,
  options?: {
    aspectRatio?: string;
    quality?: "low" | "medium" | "high" | "standard" | "hd";
    model?: string;
  }
): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured for image generation");

  const primary = options?.model ?? scoutImageModel();
  const fallbacks =
    primary === "gpt-image-1"
      ? [primary, "gpt-image-1-mini"]
      : primary.startsWith("gpt-image")
        ? [primary]
        : [primary, "gpt-image-1", "gpt-image-1-mini"];
  let lastErr: Error | null = null;

  for (const model of [...new Set(fallbacks)]) {
    if (model.startsWith("dall-e")) continue;
    try {
      return await generateOpenAiImageWithModel(prompt, model, options);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      if (isOpenAiBillingLimitError(err)) break;
      if (model !== fallbacks[fallbacks.length - 1]) {
        console.warn(`[Scout] OpenAI image (${model}) failed, trying fallback:`, lastErr.message);
      }
    }
  }
  throw lastErr ?? new Error("OpenAI image generation failed");
}

async function generateOpenAiImageWithModel(
  prompt: string,
  model: string,
  options?: {
    aspectRatio?: string;
    quality?: "low" | "medium" | "high" | "standard" | "hd";
  }
): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured for image generation");

  const size = scoutImageSize(options?.aspectRatio, model);
  const isDalle = model.startsWith("dall-e");

  const body: Record<string, unknown> = isDalle
    ? {
        model,
        prompt: prompt.slice(0, 4000),
        n: 1,
        size,
        quality: options?.quality === "hd" ? "hd" : "standard",
      }
    : {
        model,
        prompt: prompt.slice(0, 4000),
        n: 1,
        size,
        quality: options?.quality ?? "medium",
      };

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI Images (${model}): ${res.status} ${errText.slice(0, 280)}`);
  }

  const data = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
  const item = data.data?.[0];
  if (item?.b64_json) return Buffer.from(item.b64_json, "base64");
  if (item?.url) return fetchImageBufferFromUrl(item.url);
  throw new Error(`OpenAI (${model}) returned no image data`);
}

/**
 * Re-light / re-frame the uploaded location photo as a cinematic still.
 * Uses OpenAI image edits with high input fidelity to preserve room layout.
 */
export async function generateOpenAiImageFromReference(
  prompt: string,
  referenceBuffer: Buffer,
  mimeType: string,
  options?: {
    aspectRatio?: string;
    inputFidelity?: "high" | "low";
    quality?: "low" | "medium" | "high" | "standard" | "hd";
  }
): Promise<Buffer> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured for image generation");

  const model = scoutImageModel();
  if (model.startsWith("dall-e")) {
    throw new Error("Reference-based scene previs requires gpt-image-1 (set SCOUT_IMAGE_MODEL=gpt-image-1)");
  }

  const size = scoutImageSize(options?.aspectRatio, model);
  const ext = extensionForMime(mimeType);

  const form = new FormData();
  form.append(
    "image",
    new Blob([new Uint8Array(referenceBuffer)], { type: mimeType }),
    `location.${ext}`
  );
  form.append("model", model);
  form.append("prompt", prompt);
  form.append("size", size);
  form.append("n", "1");
  form.append("input_fidelity", options?.inputFidelity ?? "high");
  if (options?.quality) form.append("quality", options.quality);

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI image edit (${model}): ${res.status} ${errText.slice(0, 280)}`);
  }

  const data = (await res.json()) as { data?: { b64_json?: string; url?: string }[] };
  return extractB64FromOpenAiResponse(data);
}
