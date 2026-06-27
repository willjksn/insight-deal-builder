import { GoogleAuth } from "google-auth-library";
import { getServiceAccountCredentials } from "@/lib/firebase/admin";
import type { GeminiPart } from "@/lib/scout/geminiClient";

/** Default Vertex model (2.0 flash retired 2026-06-01). */
const DEFAULT_VERTEX_MODEL = "gemini-2.5-flash";

const VERTEX_FALLBACKS: Array<{ location: string; model: string }> = [
  { location: "us-central1", model: "gemini-2.5-flash" },
  { location: "us-central1", model: "gemini-3.5-flash" },
  { location: "global", model: "gemini-2.5-flash" },
  { location: "global", model: "gemini-3.5-flash" },
];

function vertexLocation(): string {
  return process.env.VERTEX_AI_LOCATION ?? "us-central1";
}

/** Map retired or AI Studio aliases to current Vertex model IDs. */
function normalizeVertexModel(raw: string): string {
  if (
    raw === "gemini-2.0-flash" ||
    raw === "gemini-2.0-flash-001" ||
    raw === "gemini-2.0-flash-exp"
  ) {
    return "gemini-2.5-flash";
  }
  if (raw === "gemini-2.0-flash-lite" || raw === "gemini-2.0-flash-lite-001") {
    return "gemini-2.5-flash-lite";
  }
  return raw;
}

function vertexModelId(requested?: string): string {
  const raw =
    requested ??
    process.env.VERTEX_GEMINI_MODEL ??
    process.env.GEMINI_SCOUT_MODEL ??
    DEFAULT_VERTEX_MODEL;
  return normalizeVertexModel(raw);
}

function serviceAccountEmail(): string | null {
  return getServiceAccountCredentials()?.client_email ?? null;
}

/** Email to grant Agent Platform User — exported for health checks. */
export function vertexServiceAccountEmail(): string | null {
  return serviceAccountEmail();
}

function vertexProjectId(): string | null {
  const creds = getServiceAccountCredentials();
  if (creds?.project_id) return creds.project_id;
  return (
    process.env.FIREBASE_ADMIN_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    null
  );
}

export function vertexGeminiAvailable(): boolean {
  return Boolean(getServiceAccountCredentials() && vertexProjectId());
}

export function scoutGeminiUseVertexMode(): "true" | "false" | "auto" {
  const mode = process.env.SCOUT_GEMINI_USE_VERTEX?.toLowerCase();
  if (mode === "true" || mode === "false") return mode;
  return "auto";
}

export function shouldPreferVertexGemini(): boolean {
  const mode = scoutGeminiUseVertexMode();
  if (mode === "true") return vertexGeminiAvailable();
  if (mode === "false") return false;
  return false;
}

export function canFallbackToVertexGemini(): boolean {
  return scoutGeminiUseVertexMode() !== "false" && vertexGeminiAvailable();
}

function toVertexParts(parts: GeminiPart[]): Record<string, unknown>[] {
  return parts.map((p) => {
    if ("text" in p) return { text: p.text };
    return {
      inlineData: {
        mimeType: p.inlineData.mimeType,
        data: p.inlineData.data,
      },
    };
  });
}

let cachedAuth: GoogleAuth | null = null;

async function getVertexAccessToken(): Promise<string> {
  const credentials = getServiceAccountCredentials();
  if (!credentials) {
    throw new Error("Firebase service account is not configured for Vertex AI");
  }
  if (!cachedAuth) {
    cachedAuth = new GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
  }
  const client = await cachedAuth.getClient();
  const token = await client.getAccessToken();
  if (!token.token) throw new Error("Failed to obtain Vertex AI access token");
  return token.token;
}

function vertexGenerateUrl(projectId: string, location: string, model: string): string {
  if (location === "global") {
    return `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/global/publishers/google/models/${model}:generateContent`;
  }
  return `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;
}

function buildVertexAttempts(preferredModel: string): Array<{ location: string; model: string }> {
  const preferredLocation = vertexLocation();
  const attempts: Array<{ location: string; model: string }> = [
    { location: preferredLocation, model: preferredModel },
  ];
  for (const fb of VERTEX_FALLBACKS) {
    const dup = attempts.some((a) => a.location === fb.location && a.model === fb.model);
    if (!dup) attempts.push(fb);
  }
  return attempts;
}

function throwVertexApiError(
  status: number,
  errText: string,
  location: string,
  model: string
): never {
  let detail = errText.slice(0, 500);
  try {
    const parsed = JSON.parse(errText) as { error?: { message?: string } };
    if (parsed.error?.message) detail = parsed.error.message;
  } catch {
    /* use raw */
  }
  const projectId = vertexProjectId() ?? "your-project";
  const sa = serviceAccountEmail();
  const iamUrl = `https://console.cloud.google.com/iam-admin/iam?project=${projectId}`;

  if (
    status === 403 &&
    (detail.includes("aiplatform.endpoints.predict") || detail.includes("Permission"))
  ) {
    throw new Error(
      `Vertex AI IAM: grant "Agent Platform User" (roles/aiplatform.user) to` +
        (sa ? ` ${sa}` : " your Firebase service account") +
        `. ${iamUrl} — ${detail}`
    );
  }

  if (status === 404) {
    throw new Error(
      `Vertex AI model not found (${model} in ${location}). Gemini 2.0 was retired — set ` +
        `VERTEX_GEMINI_MODEL=gemini-2.5-flash or gemini-3.5-flash. ` +
        `https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/locations — ${detail}`
    );
  }

  throw new Error(
    `Vertex AI Gemini error (${status}, ${location}, ${model}). ` +
      `https://console.cloud.google.com/apis/library/aiplatform.googleapis.com?project=${projectId} — ${detail}`
  );
}

async function vertexGenerateOnce(
  projectId: string,
  location: string,
  model: string,
  token: string,
  body: Record<string, unknown>
): Promise<{ ok: true; text: string } | { ok: false; status: number; errText: string }> {
  const url = vertexGenerateUrl(projectId, location, model);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return { ok: false, status: res.status, errText: await res.text() };
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return { ok: false, status: 500, errText: "Empty response from Vertex AI Gemini" };
  }
  return { ok: true, text };
}

function extractImageBufferFromVertexResponse(data: {
  candidates?: {
    content?: {
      parts?: Array<{
        inlineData?: { data?: string };
        inline_data?: { data?: string };
      }>;
    };
  }[];
}): Buffer | null {
  for (const part of data.candidates?.[0]?.content?.parts ?? []) {
    const inline = part.inlineData ?? part.inline_data;
    if (inline?.data) return Buffer.from(inline.data, "base64");
  }
  return null;
}

async function vertexGenerateImageOnce(
  projectId: string,
  location: string,
  model: string,
  token: string,
  body: Record<string, unknown>
): Promise<{ ok: true; buffer: Buffer } | { ok: false; status: number; errText: string }> {
  const url = vertexGenerateUrl(projectId, location, model);
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    return { ok: false, status: res.status, errText: await res.text() };
  }

  const data = (await res.json()) as {
    candidates?: {
      content?: {
        parts?: Array<{
          inlineData?: { data?: string };
          inline_data?: { data?: string };
        }>;
      };
    }[];
  };
  const buffer = extractImageBufferFromVertexResponse(data);
  if (!buffer) {
    return { ok: false, status: 500, errText: "Vertex AI returned no image data" };
  }
  return { ok: true, buffer };
}

function vertexImageModelId(): string {
  return (
    process.env.VERTEX_GEMINI_IMAGE_MODEL ??
    process.env.GEMINI_IMAGE_MODEL ??
    "gemini-2.5-flash-image"
  );
}

function buildVertexImageAttempts(preferredModel: string): Array<{ location: string; model: string }> {
  const preferredLocation = vertexLocation();
  const attempts: Array<{ location: string; model: string }> = [
    { location: preferredLocation, model: preferredModel },
    { location: "us-central1", model: preferredModel },
    { location: "global", model: preferredModel },
  ];
  if (preferredModel !== "gemini-2.5-flash-image") {
    for (const location of [preferredLocation, "us-central1", "global"]) {
      attempts.push({ location, model: "gemini-2.5-flash-image" });
    }
  }
  const seen = new Set<string>();
  return attempts.filter(({ location, model }) => {
    const key = `${location}:${model}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function vertexGeminiGenerateImage(params: {
  prompt: string;
  referenceInline?: { mimeType: string; data: string };
  aspectRatio?: string;
}): Promise<Buffer> {
  const projectId = vertexProjectId();
  if (!projectId) {
    throw new Error("Cannot determine GCP project ID for Vertex AI image generation");
  }

  const preferredModel = vertexImageModelId();
  const token = await getVertexAccessToken();
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

  const body = {
    contents: [{ role: "user", parts: toVertexParts(parts) }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio: aspect },
    },
  };

  const attempts = buildVertexImageAttempts(preferredModel);
  let lastError = { status: 500, errText: "No Vertex image attempts", location: "unknown", model: preferredModel };

  for (const { location, model } of attempts) {
    const result = await vertexGenerateImageOnce(projectId, location, model, token, body);
    if (result.ok) {
      if (model !== preferredModel || location !== vertexLocation()) {
        console.info(`[Scout] Vertex image using ${model} @ ${location}`);
      }
      return result.buffer;
    }
    lastError = { status: result.status, errText: result.errText, location, model };
    if (result.status !== 404) {
      throwVertexApiError(result.status, result.errText, location, model);
    }
  }

  throwVertexApiError(lastError.status, lastError.errText, lastError.location, lastError.model);
}

export async function vertexGeminiGenerate(params: {
  systemPrompt: string;
  userParts: GeminiPart[];
  json?: boolean;
  model?: string;
  temperature?: number;
}): Promise<string> {
  const projectId = vertexProjectId();
  if (!projectId) {
    throw new Error("Cannot determine GCP project ID for Vertex AI");
  }

  const preferredModel = vertexModelId(params.model);
  const token = await getVertexAccessToken();
  const body = {
    systemInstruction: { parts: [{ text: params.systemPrompt }] },
    contents: [{ role: "user", parts: toVertexParts(params.userParts) }],
    generationConfig: {
      ...(params.json ? { responseMimeType: "application/json" } : {}),
      temperature: params.temperature ?? 0.4,
    },
  };

  const attempts = buildVertexAttempts(preferredModel);
  let lastError = { status: 500, errText: "No Vertex attempts", location: "unknown", model: preferredModel };

  for (const { location, model } of attempts) {
    const result = await vertexGenerateOnce(projectId, location, model, token, body);
    if (result.ok) {
      if (model !== preferredModel || location !== vertexLocation()) {
        console.info(`[Scout] Vertex using ${model} @ ${location}`);
      }
      return result.text;
    }
    lastError = { status: result.status, errText: result.errText, location, model };
    if (result.status !== 404) {
      throwVertexApiError(result.status, result.errText, location, model);
    }
  }

  throwVertexApiError(lastError.status, lastError.errText, lastError.location, lastError.model);
}

export function vertexEnableUrl(): string | null {
  const projectId = vertexProjectId();
  return projectId
    ? `https://console.cloud.google.com/apis/library/aiplatform.googleapis.com?project=${projectId}`
    : null;
}
