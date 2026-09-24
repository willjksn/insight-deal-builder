import type { VisualQuality } from "./types";

/** Runway sells credits at $0.01 each. */
export const CREDIT_USD = 0.01;

export const STILL_MODEL_WITH_REFERENCES = "gen4_image_turbo";
export const STILL_MODEL_WITHOUT_REFERENCES = "gen4_image";
export const MOTION_FAST_MODEL = "gen4_turbo";
export const MOTION_QUALITY_MODEL = "gen4.5";

export function stillModel(referenceCount: number): { model: string; credits: number } {
  if (referenceCount > 0) return { model: STILL_MODEL_WITH_REFERENCES, credits: 2 };
  return { model: STILL_MODEL_WITHOUT_REFERENCES, credits: 5 };
}

export function motionModel(quality: VisualQuality, seconds: number): { model: string; credits: number } {
  const safeSeconds = Math.min(10, Math.max(2, Math.round(seconds || 5)));
  if (quality === "high") return { model: MOTION_QUALITY_MODEL, credits: 12 * safeSeconds };
  return { model: MOTION_FAST_MODEL, credits: 5 * safeSeconds };
}

export function creditsToUsd(credits: number): number {
  return Math.round(credits * CREDIT_USD * 100) / 100;
}

export function formatApproxCost(credits: number): string {
  return `Approx. $${creditsToUsd(credits).toFixed(2)}`;
}
