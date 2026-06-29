import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase/admin";
import { getAiUsageContext } from "@/lib/ai/usageContext";
import { AiUsageFeatureSummary, AiUsageMonthlySummary } from "@/lib/ai/usageTypes";
import {
  estimateGeminiImageUsd,
  estimateGeminiTextUsd,
  estimateTavilyUsd,
  GEMINI_TEXT_FALLBACK_INPUT,
  GEMINI_TEXT_FALLBACK_OUTPUT,
} from "@/lib/ai/usagePricing";

export type AiUsageKind =
  | "gemini_text"
  | "gemini_image"
  | "tavily_basic"
  | "tavily_advanced"
  | "openai_image";

export type AiUsageRecordInput = {
  kind: AiUsageKind;
  provider: "gemini_api" | "vertex" | "tavily" | "openai";
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  imageCount?: number;
  tavilyCredits?: number;
  estimatedUsd: number;
  feature?: string;
  userId?: string;
};

const COLLECTION = "aiUsageMonthly";

function monthKeyFromDate(date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function featureKey(feature: string): string {
  return feature.replace(/\./g, "_");
}

function shouldSkipLogging(feature: string): boolean {
  return feature.startsWith("health.");
}

/** Fire-and-forget — never blocks AI responses on logging failures. */
export function recordAiUsage(input: AiUsageRecordInput): void {
  const ctx = getAiUsageContext();
  const feature = input.feature ?? ctx?.feature ?? "unspecified";
  if (shouldSkipLogging(feature)) return;

  void persistUsage({
    ...input,
    feature,
    userId: input.userId ?? ctx?.userId,
  }).catch((err) => {
    console.warn("[aiUsage] failed to record:", err instanceof Error ? err.message : err);
  });
}

async function persistUsage(input: AiUsageRecordInput & { feature: string }): Promise<void> {
  const db = getAdminDb();
  if (!db) return;

  const monthKey = monthKeyFromDate();
  const fKey = featureKey(input.feature);
  const kKey = input.kind;

  const ref = db.collection(COLLECTION).doc(monthKey);
  await ref.set(
    {
      monthKey,
      updatedAt: FieldValue.serverTimestamp(),
      callCount: FieldValue.increment(1),
      totalEstimatedUsd: FieldValue.increment(input.estimatedUsd),
      inputTokens: FieldValue.increment(input.inputTokens ?? 0),
      outputTokens: FieldValue.increment(input.outputTokens ?? 0),
      imageCount: FieldValue.increment(input.imageCount ?? 0),
      tavilyCredits: FieldValue.increment(input.tavilyCredits ?? 0),
      [`byFeature.${fKey}.calls`]: FieldValue.increment(1),
      [`byFeature.${fKey}.estimatedUsd`]: FieldValue.increment(input.estimatedUsd),
      [`byFeature.${fKey}.inputTokens`]: FieldValue.increment(input.inputTokens ?? 0),
      [`byFeature.${fKey}.outputTokens`]: FieldValue.increment(input.outputTokens ?? 0),
      [`byKind.${kKey}.calls`]: FieldValue.increment(1),
      [`byKind.${kKey}.estimatedUsd`]: FieldValue.increment(input.estimatedUsd),
    },
    { merge: true }
  );
}

export function logGeminiTextUsage(params: {
  provider: "gemini_api" | "vertex";
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
}): void {
  const input = params.inputTokens ?? GEMINI_TEXT_FALLBACK_INPUT;
  const output = params.outputTokens ?? GEMINI_TEXT_FALLBACK_OUTPUT;
  recordAiUsage({
    kind: "gemini_text",
    provider: params.provider,
    model: params.model,
    inputTokens: input,
    outputTokens: output,
    estimatedUsd: estimateGeminiTextUsd(input, output),
  });
}

export function logGeminiImageUsage(params: {
  provider: "gemini_api" | "vertex";
  model?: string;
  inputTokens?: number;
}): void {
  const input = params.inputTokens ?? 800;
  recordAiUsage({
    kind: "gemini_image",
    provider: params.provider,
    model: params.model,
    inputTokens: input,
    outputTokens: 1290,
    imageCount: 1,
    estimatedUsd: estimateGeminiImageUsd(input),
  });
}

export function logTavilyUsage(searchDepth: "basic" | "advanced"): void {
  const credits = searchDepth === "advanced" ? 2 : 1;
  recordAiUsage({
    kind: searchDepth === "advanced" ? "tavily_advanced" : "tavily_basic",
    provider: "tavily",
    tavilyCredits: credits,
    estimatedUsd: estimateTavilyUsd(credits),
  });
}

export function logOpenAiImageUsage(estimatedUsd = 0.04): void {
  recordAiUsage({
    kind: "openai_image",
    provider: "openai",
    imageCount: 1,
    estimatedUsd,
  });
}

function normalizeFeatureMap(
  raw: Record<string, Partial<AiUsageFeatureSummary>> | undefined
): Record<string, AiUsageFeatureSummary> {
  if (!raw) return {};
  const out: Record<string, AiUsageFeatureSummary> = {};
  for (const [key, val] of Object.entries(raw)) {
    if (!val) continue;
    out[key] = {
      calls: val.calls ?? 0,
      estimatedUsd: val.estimatedUsd ?? 0,
      inputTokens: val.inputTokens ?? 0,
      outputTokens: val.outputTokens ?? 0,
    };
  }
  return out;
}

export async function loadAiUsageMonthly(monthKey?: string): Promise<AiUsageMonthlySummary | null> {
  const db = getAdminDb();
  if (!db) return null;

  const key = monthKey ?? monthKeyFromDate();
  const snap = await db.collection(COLLECTION).doc(key).get();
  if (!snap.exists) {
    return {
      monthKey: key,
      callCount: 0,
      totalEstimatedUsd: 0,
      inputTokens: 0,
      outputTokens: 0,
      imageCount: 0,
      tavilyCredits: 0,
      byFeature: {},
      byKind: {},
    };
  }

  const data = snap.data()!;
  return {
    monthKey: key,
    callCount: data.callCount ?? 0,
    totalEstimatedUsd: data.totalEstimatedUsd ?? 0,
    inputTokens: data.inputTokens ?? 0,
    outputTokens: data.outputTokens ?? 0,
    imageCount: data.imageCount ?? 0,
    tavilyCredits: data.tavilyCredits ?? 0,
    byFeature: normalizeFeatureMap(data.byFeature),
    byKind: (data.byKind as Record<string, { calls: number; estimatedUsd: number }>) ?? {},
    updatedAt:
      data.updatedAt?.toDate?.()?.toISOString?.() ??
      (typeof data.updatedAt === "string" ? data.updatedAt : undefined),
  };
}
