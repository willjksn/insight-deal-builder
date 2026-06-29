export type PricingBenchmarkCategory =
  | "production"
  | "gear"
  | "location"
  | "talent"
  | "crew"
  | "props"
  | "other";

export interface PricingLineItemBenchmark {
  category: PricingBenchmarkCategory;
  label: string;
  lowUsd: number;
  highUsd: number;
  notes?: string;
}

/** On-demand market pricing research (Tavily + Gemini). Suggestions only — not auto-applied. */
export interface MarketPricingResearch {
  provider: "tavily";
  researchedAt: string;
  /** Human-readable market, e.g. "Charlotte, NC (28202)" */
  marketArea: string;
  city?: string;
  zip?: string;
  state?: string;
  summary: string;
  suggestedTotalFeeLow: number;
  suggestedTotalFeeHigh: number;
  lineItems: PricingLineItemBenchmark[];
  competitiveNotes: string[];
  cautions: string[];
  sourceTitles: string[];
  /** How your catalog / quoted fee compares to the market band */
  comparisonNotes?: string;
}

export const PRICING_CATEGORY_LABELS: Record<PricingBenchmarkCategory, string> = {
  production: "Production / day rate",
  gear: "Gear rental",
  location: "Location / studio",
  talent: "Talent",
  crew: "Crew / DP / editor",
  props: "Props / wardrobe",
  other: "Other",
};
