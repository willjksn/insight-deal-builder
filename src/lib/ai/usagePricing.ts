/** Published Gemini 2.5 Flash rates (USD per 1M tokens). */
export const GEMINI_FLASH_INPUT_PER_M = 0.3;
export const GEMINI_FLASH_OUTPUT_PER_M = 2.5;

/** ~1024×1024 image via 2.5 Flash Image. */
export const GEMINI_IMAGE_USD = 0.039;

/** Tavily pay-as-you-go per credit (1 basic search = 1 credit). */
export const TAVILY_CREDIT_USD = 0.008;

/** Fallback when providers omit token counts (typical JSON scope/pricing call). */
export const GEMINI_TEXT_FALLBACK_INPUT = 5_000;
export const GEMINI_TEXT_FALLBACK_OUTPUT = 2_000;

export function estimateGeminiTextUsd(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * GEMINI_FLASH_INPUT_PER_M +
    (outputTokens / 1_000_000) * GEMINI_FLASH_OUTPUT_PER_M
  );
}

export function estimateGeminiImageUsd(inputTokens = 800): number {
  return estimateGeminiTextUsd(inputTokens, 0) + GEMINI_IMAGE_USD;
}

export function estimateTavilyUsd(credits: number): number {
  return credits * TAVILY_CREDIT_USD;
}

export function formatUsd(amount: number): string {
  if (amount < 0.01 && amount > 0) return "< $0.01";
  return `$${amount.toFixed(2)}`;
}
