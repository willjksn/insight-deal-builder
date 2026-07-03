import { throwGeminiApiError } from "@/lib/ai/geminiErrors";
import { logGeminiImageUsage, logGeminiTextUsage } from "@/lib/ai/usageLog";
import {
  canFallbackToVertexGemini,
  shouldPreferVertexGemini,
  vertexGeminiGenerate,
  vertexGeminiGenerateImage,
} from "@/lib/ai/geminiVertex";

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export type GeminiChatTurn = {
  role: "user" | "model";
  parts: GeminiPart[];
};

function geminiModel(override?: string): string {
  const raw = override ?? process.env.GEMINI_SCOUT_MODEL ?? "gemini-2.5-flash";
  if (raw === "gemini-2.0-flash" || raw === "gemini-2.0-flash-001") return "gemini-2.5-flash";
  return raw;
}

function geminiImageModel(): string {
  return process.env.GEMINI_IMAGE_MODEL ?? "gemini-2.5-flash-image";
}

function toGeminiApiParts(parts: GeminiPart[]): Record<string, unknown>[] {
  return parts.map((p) => {
    if ("text" in p) return { text: p.text };
    return {
      inline_data: {
        mime_type: p.inlineData.mimeType,
        data: p.inlineData.data,
      },
    };
  });
}

let geminiApiKeyUsable: boolean | null = null;

function shouldRetryWithVertexGemini(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  return (
    msg.includes("403") ||
    lower.includes("blocked") ||
    msg.includes("PERMISSION_DENIED") ||
    lower.includes("invalid gemini api key") ||
    lower.includes("missing or invalid api key") ||
    lower.includes("api key not valid") ||
    (lower.includes("api key") && (lower.includes("invalid") || lower.includes("missing")))
  );
}

async function callGeminiApiKeyGenerate(params: {
  systemPrompt: string;
  userParts?: GeminiPart[];
  history?: GeminiChatTurn[];
  json?: boolean;
  model?: string;
  temperature?: number;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

  const model = geminiModel(params.model);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents = params.history?.length
    ? params.history.map((turn) => ({
        role: turn.role,
        parts: toGeminiApiParts(turn.parts),
      }))
    : [{ role: "user", parts: toGeminiApiParts(params.userParts ?? []) }];

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: params.systemPrompt }] },
      contents,
      generationConfig: {
        ...(params.json ? { responseMimeType: "application/json" } : {}),
        temperature: params.temperature ?? 0.4,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throwGeminiApiError(res.status, errText);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini");
  logGeminiTextUsage({
    provider: "gemini_api",
    model,
    inputTokens: data.usageMetadata?.promptTokenCount,
    outputTokens: data.usageMetadata?.candidatesTokenCount,
  });
  return text;
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence ? fence[1].trim() : trimmed;
  return JSON.parse(raw);
}

export async function fetchImageInlineData(
  url: string
): Promise<{ mimeType: string; data: string } | null> {
  return fetchMediaInlineData(url, 8 * 1024 * 1024);
}

export async function fetchMediaInlineData(
  url: string,
  maxBytes = 8 * 1024 * 1024
): Promise<{ mimeType: string; data: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type")?.split(";")[0] ?? "application/octet-stream";
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > maxBytes) return null;
    return { mimeType: contentType, data: buffer.toString("base64") };
  } catch {
    return null;
  }
}

export type GeminiProvider = "api_key" | "vertex";

export async function callGeminiGenerate(params: {
  systemPrompt: string;
  userParts?: GeminiPart[];
  history?: GeminiChatTurn[];
  json?: boolean;
  model?: string;
  temperature?: number;
}): Promise<string> {
  const model = geminiModel(params.model);

  if (shouldPreferVertexGemini()) {
    return vertexGeminiGenerate({ ...params, model });
  }

  if (geminiApiKeyUsable === false && canFallbackToVertexGemini()) {
    return vertexGeminiGenerate({ ...params, model });
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    if (canFallbackToVertexGemini()) {
      return vertexGeminiGenerate({ ...params, model });
    }
    throw new Error("GEMINI_API_KEY is not configured");
  }

  try {
    const text = await callGeminiApiKeyGenerate(params);
    geminiApiKeyUsable = true;
    return text;
  } catch (err) {
    if (canFallbackToVertexGemini() && shouldRetryWithVertexGemini(err)) {
      geminiApiKeyUsable = false;
      console.warn("[Scout] Gemini API key unavailable — using Vertex AI fallback");
      return vertexGeminiGenerate({ ...params, model });
    }
    throw err;
  }
}

/** Which provider succeeded (for health checks). */
export async function probeGeminiConnection(): Promise<{
  ok: true;
  provider: GeminiProvider;
  reply: string;
}> {
  const ping = {
    systemPrompt: "Reply with exactly: OK",
    userParts: [{ text: "ping" }] as GeminiPart[],
    temperature: 0,
  };

  if (shouldPreferVertexGemini() || !process.env.GEMINI_API_KEY?.trim()) {
    const reply = await vertexGeminiGenerate(ping);
    return { ok: true, provider: "vertex", reply };
  }

  try {
    const reply = await callGeminiApiKeyGenerate(ping);
    return { ok: true, provider: "api_key", reply };
  } catch (err) {
    if (canFallbackToVertexGemini() && shouldRetryWithVertexGemini(err)) {
      const reply = await vertexGeminiGenerate(ping);
      return { ok: true, provider: "vertex", reply };
    }
    throw err;
  }
}

function extractGeminiImageBuffer(data: {
  candidates?: {
    content?: {
      parts?: Array<{
        inline_data?: { data?: string };
        inlineData?: { data?: string };
      }>;
    };
  }[];
}): Buffer | null {
  for (const part of data.candidates?.[0]?.content?.parts ?? []) {
    const inline = part.inline_data ?? part.inlineData;
    if (inline?.data) return Buffer.from(inline.data, "base64");
  }
  return null;
}

async function callGeminiApiKeyGenerateImage(params: {
  prompt: string;
  referenceInline?: { mimeType: string; data: string };
  aspectRatio?: string;
}): Promise<Buffer> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured for Gemini image generation");

  const model = geminiImageModel();
  const parts: GeminiPart[] = [{ text: params.prompt }];
  if (params.referenceInline) {
    parts.push({ inlineData: params.referenceInline });
  }

  const aspect =
    params.aspectRatio === "9:16" || params.aspectRatio === "4:5"
      ? "9:16"
      : params.aspectRatio === "16:9" || params.aspectRatio === "2.39:1"
        ? "16:9"
        : "16:9";

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: toGeminiApiParts(parts) }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: { aspectRatio: aspect },
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throwGeminiApiError(res.status, errText);
  }

  const data = (await res.json()) as {
    candidates?: {
      content?: {
        parts?: Array<{
          inline_data?: { data?: string };
          inlineData?: { data?: string };
        }>;
      };
    }[];
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
    };
  };

  const buffer = extractGeminiImageBuffer(data);
  if (!buffer) throw new Error("Gemini returned no image data");
  logGeminiImageUsage({
    provider: "gemini_api",
    model,
    inputTokens: data.usageMetadata?.promptTokenCount,
  });
  return buffer;
}

export function geminiImageGenEnabled(): boolean {
  if (process.env.SCOUT_USE_MOCK_AI === "true") return false;
  return Boolean(process.env.GEMINI_API_KEY?.trim()) || canFallbackToVertexGemini();
}

/** @deprecated */
export const scoutGeminiImageGenEnabled = geminiImageGenEnabled;

/** Generate a cinematic image using the uploaded location photo as reference. */
export async function callGeminiGenerateImage(params: {
  prompt: string;
  referenceInline?: { mimeType: string; data: string };
  aspectRatio?: string;
}): Promise<Buffer> {
  if (shouldPreferVertexGemini()) {
    return vertexGeminiGenerateImage(params);
  }

  if (!process.env.GEMINI_API_KEY?.trim()) {
    if (canFallbackToVertexGemini()) {
      return vertexGeminiGenerateImage(params);
    }
    throw new Error("GEMINI_API_KEY is not configured for Gemini image generation");
  }

  try {
    return await callGeminiApiKeyGenerateImage(params);
  } catch (err) {
    if (canFallbackToVertexGemini() && shouldRetryWithVertexGemini(err)) {
      console.warn("[Scout] Gemini image API key unavailable — using Vertex AI fallback");
      return vertexGeminiGenerateImage(params);
    }
    throw err;
  }
}

export async function callGeminiJson(
  systemPrompt: string,
  userParts: GeminiPart[],
  model?: string
): Promise<unknown> {
  const text = await callGeminiGenerate({ systemPrompt, userParts, json: true, model });
  return extractJson(text);
}

export async function callGeminiJsonWithHistory(
  systemPrompt: string,
  history: GeminiChatTurn[],
  options?: { model?: string; temperature?: number }
): Promise<unknown> {
  const text = await callGeminiGenerate({
    systemPrompt,
    history,
    json: true,
    model: options?.model,
    temperature: options?.temperature,
  });
  return extractJson(text);
}

export async function callGeminiJsonText(systemPrompt: string, userPrompt: string): Promise<unknown> {
  return callGeminiJson(systemPrompt, [{ text: userPrompt }]);
}

export async function callGeminiJsonWithImages(
  systemPrompt: string,
  userPrompt: string,
  imageUrls: string[],
  model?: string
): Promise<unknown> {
  const parts: GeminiPart[] = [{ text: userPrompt }];
  for (const url of imageUrls) {
    const inline = await fetchImageInlineData(url);
    if (inline) {
      parts.push({ inlineData: inline });
    }
  }
  if (parts.length === 1) {
    throw new Error("Could not load uploaded location photos for vision analysis");
  }
  return callGeminiJson(systemPrompt, parts, model);
}

export type GeminiMediaInput = {
  url: string;
  kind: "image" | "video";
  label?: string;
};

export async function callGeminiJsonWithMedia(
  systemPrompt: string,
  userPrompt: string,
  media: GeminiMediaInput[],
  options?: { model?: string; temperature?: number }
): Promise<unknown> {
  const parts: GeminiPart[] = [{ text: userPrompt }];
  for (const item of media) {
    const maxBytes = item.kind === "video" ? 20 * 1024 * 1024 : 8 * 1024 * 1024;
    const inline = await fetchMediaInlineData(item.url, maxBytes);
    if (inline) {
      if (item.label) {
        parts.push({ text: `[${item.kind}: ${item.label}]` });
      }
      parts.push({ inlineData: inline });
    }
  }
  const text = await callGeminiGenerate({
    systemPrompt,
    userParts: parts,
    json: true,
    model: options?.model,
    temperature: options?.temperature,
  });
  return extractJson(text);
}
