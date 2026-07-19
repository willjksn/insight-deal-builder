export type AiUsageFeatureSummary = {
  calls: number;
  estimatedUsd: number;
  inputTokens: number;
  outputTokens: number;
};

export type AiUsageMonthlySummary = {
  monthKey: string;
  callCount: number;
  totalEstimatedUsd: number;
  inputTokens: number;
  outputTokens: number;
  imageCount: number;
  tavilyCredits: number;
  byFeature: Record<string, AiUsageFeatureSummary>;
  byKind: Record<string, { calls: number; estimatedUsd: number }>;
  updatedAt?: string;
};

export const AI_USAGE_FEATURE_LABELS: Record<string, string> = {
  scout_analyze: "Legacy scout — location analysis",
  scout_dp_plan: "Legacy scout — DP plan",
  scout_shot_list: "Legacy scout — shot list",
  scout_preview: "Legacy scout — previs images",
  scout_technique: "Legacy scout — technique lookup",
  scout_gear: "Legacy scout — gear suggest",
  coverage_frame: "Coverage — AI storyboard frames",
  script_writer_chat: "Script writer — chat",
  script_writer_analyze: "Script writer — inspiration analyze",
  script_writer_generate: "Script writer — generate",
  script_writer_refine: "Script writer — refine",
  script_writer_trends: "Script writer — trends",
  script_writer_create: "Script writer — new session",
  agreements_scope: "Agreements — scope suggest",
  agreements_pricing: "Agreements — market pricing",
  cron_trends: "Cron — weekly trend snapshots",
  unspecified: "Other / unspecified",
  api_other: "Other API",
};
