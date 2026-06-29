import { AgreementType, EquipmentCatalogItem, LocationCatalogItem, ServicePackage } from "@/lib/types";
import { summarizeWebResearch } from "@/lib/search/researchSummarize";
import { tavilySearch, tavilyAvailable } from "@/lib/search/tavilyClient";
import { scoutAiUsesMock } from "@/lib/scout/cineScoutAi";
import { formatMarketArea } from "@/lib/agreement/marketArea";
import {
  MarketPricingResearch,
  PricingBenchmarkCategory,
  PricingLineItemBenchmark,
} from "@/lib/agreement/pricingResearchTypes";

const PRICING_SYSTEM = `You are a production pricing analyst helping Insight Media Group LLC benchmark quotes.

Given web search results about market rates, return JSON only:
{
  "summary": "2-3 sentences on typical pricing for this scope in this market",
  "suggestedTotalFeeLow": number,
  "suggestedTotalFeeHigh": number,
  "lineItems": [
    {
      "category": "production|gear|location|talent|crew|props|other",
      "label": "short label",
      "lowUsd": number,
      "highUsd": number,
      "notes": "optional context"
    }
  ],
  "competitiveNotes": ["how to stay competitive — max 4"],
  "cautions": ["underpricing risks or scope gaps — max 3"],
  "sourceTitles": ["titles from research"],
  "comparisonNotes": "optional — if catalog context provided, 1-2 sentences comparing market to their packages/rates"
}

Rules:
- USD integers only. lowUsd <= highUsd.
- Base ranges on the research and market area (city/zip). Regional markets differ — do not assume national averages if local data exists.
- Include gear, location, and crew/talent line items when relevant to the job description.
- These are suggestions for a producer to review — not binding quotes.
- If research is thin, widen ranges and say so in cautions.`;

const VALID_CATEGORIES: PricingBenchmarkCategory[] = [
  "production",
  "gear",
  "location",
  "talent",
  "crew",
  "props",
  "other",
];

function buildPricingSearchQuery(
  jobDescription: string,
  marketArea: string,
  agreementType?: AgreementType
): string {
  const year = new Date().getFullYear();
  const typeHint =
    agreementType === "equipment_rental"
      ? "camera lighting gear rental daily rate"
      : agreementType === "location_agreement"
        ? "film location studio day rate permit"
        : agreementType === "talent_agreement"
          ? "video talent day rate"
          : "commercial video production videography pricing day rate";
  const locationHint = marketArea.includes("ZIP") || marketArea.includes("United States")
    ? marketArea
    : `${marketArea} area`;
  const scopeSnippet = jobDescription.trim().slice(0, 120);
  return [
    typeHint,
    locationHint,
    scopeSnippet,
    `market rates ${year}`,
    "production company quote",
    "gear rental location fee",
  ]
    .filter(Boolean)
    .join(" ");
}

function sanitizeLineItem(raw: Record<string, unknown>): PricingLineItemBenchmark | null {
  const category = raw.category;
  if (typeof category !== "string" || !VALID_CATEGORIES.includes(category as PricingBenchmarkCategory)) {
    return null;
  }
  const label = typeof raw.label === "string" ? raw.label.trim() : "";
  if (!label) return null;
  let low = typeof raw.lowUsd === "number" ? Math.round(raw.lowUsd) : 0;
  let high = typeof raw.highUsd === "number" ? Math.round(raw.highUsd) : 0;
  if (low <= 0 && high <= 0) return null;
  if (low <= 0) low = high;
  if (high <= 0) high = low;
  if (low > high) [low, high] = [high, low];
  return {
    category: category as PricingBenchmarkCategory,
    label,
    lowUsd: low,
    highUsd: high,
    notes: typeof raw.notes === "string" ? raw.notes.trim() : undefined,
  };
}

function formatCatalogContext(
  packages: ServicePackage[],
  equipment: EquipmentCatalogItem[],
  locations: LocationCatalogItem[],
  yourQuotedFee?: number
): string[] {
  const lines: string[] = ["=== YOUR CATALOG (anchor — compare market to these) ==="];
  if (packages.length) {
    lines.push(
      "Service packages:",
      ...packages.slice(0, 8).map((p) => `- ${p.name}: $${p.price.toLocaleString()} (${p.projectType})`)
    );
  }
  const gearSample = equipment.filter((e) => e.active !== false).slice(0, 10);
  if (gearSample.length) {
    lines.push(
      "Equipment daily rates (sample):",
      ...gearSample.map(
        (e) =>
          `- ${e.name}: $${e.dailyRate}/day${e.weeklyRate ? ` ($${e.weeklyRate}/wk)` : ""}`
      )
    );
  }
  const locSample = locations.slice(0, 6);
  if (locSample.length) {
    lines.push(
      "Location fees (sample):",
      ...locSample.map(
        (l) =>
          `- ${l.propertyName}: $${l.locationFee}${l.locationFeeType === "day" ? "/day" : " flat"}`
      )
    );
  }
  if (yourQuotedFee != null && yourQuotedFee > 0) {
    lines.push(`Current wizard fee: $${yourQuotedFee.toLocaleString()}`);
  }
  return lines;
}

function mockPricingResearch(
  jobDescription: string,
  marketArea: string,
  yourQuotedFee?: number
): MarketPricingResearch {
  const base = yourQuotedFee && yourQuotedFee > 0 ? yourQuotedFee : 2500;
  return {
    provider: "tavily",
    researchedAt: new Date().toISOString(),
    marketArea,
    summary: `Mock benchmarks for ${marketArea}. Enable Tavily + Gemini for live market research.`,
    suggestedTotalFeeLow: Math.round(base * 0.85),
    suggestedTotalFeeHigh: Math.round(base * 1.25),
    lineItems: [
      {
        category: "production",
        label: "Full-day production (small crew)",
        lowUsd: Math.round(base * 0.6),
        highUsd: Math.round(base * 0.9),
      },
      {
        category: "gear",
        label: "Camera + lighting package",
        lowUsd: 250,
        highUsd: 750,
        notes: "Compare to your equipment catalog",
      },
      {
        category: "location",
        label: "Location / studio day",
        lowUsd: 200,
        highUsd: 1500,
      },
    ],
    competitiveNotes: [
      "Confirm deliverable count and revision rounds before locking fee.",
      `Scope hint: ${jobDescription.slice(0, 80)}…`,
    ],
    cautions: ["Mock data — configure TAVILY_API_KEY for live regional pricing."],
    sourceTitles: ["Mock research"],
    comparisonNotes: yourQuotedFee
      ? `Your quoted $${yourQuotedFee.toLocaleString()} is within the mock band.`
      : undefined,
  };
}

export async function researchMarketPricing(input: {
  jobDescription: string;
  city?: string;
  zip?: string;
  state?: string;
  agreementType?: AgreementType;
  yourQuotedFee?: number;
  packages?: ServicePackage[];
  equipment?: EquipmentCatalogItem[];
  locations?: LocationCatalogItem[];
}): Promise<MarketPricingResearch> {
  const jobDescription = input.jobDescription.trim();
  if (!jobDescription) throw new Error("Describe the job first");

  const marketArea = formatMarketArea(input);
  const hasLocation = Boolean(
    input.city?.trim() || input.zip?.trim() || input.state?.trim()
  );
  if (!hasLocation) {
    throw new Error("Enter a city or ZIP so we can research the right market.");
  }

  if (scoutAiUsesMock() || !tavilyAvailable()) {
    if (!tavilyAvailable() && !scoutAiUsesMock()) {
      throw new Error("TAVILY_API_KEY is not configured on the server");
    }
    return mockPricingResearch(jobDescription, marketArea, input.yourQuotedFee);
  }

  const query = buildPricingSearchQuery(jobDescription, marketArea, input.agreementType);
  const search = await tavilySearch(query, {
    maxResults: 8,
    searchDepth: "advanced",
    includeAnswer: true,
  });

  const catalogLines = formatCatalogContext(
    input.packages ?? [],
    input.equipment ?? [],
    input.locations ?? [],
    input.yourQuotedFee
  );

  const raw = await summarizeWebResearch<Record<string, unknown>>(PRICING_SYSTEM, search, [
    `Job description: ${jobDescription}`,
    `Market area: ${marketArea}`,
    input.agreementType ? `Agreement type: ${input.agreementType}` : "",
    ...catalogLines,
  ]);

  const lineItems = (Array.isArray(raw.lineItems) ? raw.lineItems : [])
    .map((item) => sanitizeLineItem(item as Record<string, unknown>))
    .filter((item): item is PricingLineItemBenchmark => Boolean(item));

  let low =
    typeof raw.suggestedTotalFeeLow === "number" ? Math.round(raw.suggestedTotalFeeLow) : 0;
  let high =
    typeof raw.suggestedTotalFeeHigh === "number" ? Math.round(raw.suggestedTotalFeeHigh) : 0;
  if (low <= 0 && high <= 0) {
    low = 1500;
    high = 5000;
  }
  if (low > high) [low, high] = [high, low];

  return {
    provider: "tavily",
    researchedAt: new Date().toISOString(),
    marketArea,
    city: input.city?.trim() || undefined,
    zip: input.zip?.trim() || undefined,
    state: input.state?.trim().toUpperCase() || undefined,
    summary: typeof raw.summary === "string" ? raw.summary.trim() : "Market pricing researched for this scope.",
    suggestedTotalFeeLow: low,
    suggestedTotalFeeHigh: high,
    lineItems,
    competitiveNotes: Array.isArray(raw.competitiveNotes)
      ? raw.competitiveNotes.filter((n): n is string => typeof n === "string" && n.trim().length > 0)
      : [],
    cautions: Array.isArray(raw.cautions)
      ? raw.cautions.filter((n): n is string => typeof n === "string" && n.trim().length > 0)
      : [],
    sourceTitles: Array.isArray(raw.sourceTitles)
      ? raw.sourceTitles.filter((n): n is string => typeof n === "string" && n.trim().length > 0)
      : search.results.slice(0, 5).map((r) => r.title),
    comparisonNotes:
      typeof raw.comparisonNotes === "string" ? raw.comparisonNotes.trim() : undefined,
  };
}
