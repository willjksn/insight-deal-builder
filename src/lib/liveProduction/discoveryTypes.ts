import type { LiveOpportunitySourceKind } from "@/lib/liveProduction/types";
import type { LiveProductionTargetProfile } from "@/lib/liveProduction/defaultsKeywords";

export type LiveDiscoveryPriority = "high" | "good" | "review";

export type LiveDiscoveryCandidate = {
  id: string;
  title: string;
  organizationName: string;
  opportunityType: string;
  location?: string;
  sourceUrl?: string;
  sourceKind: LiveOpportunitySourceKind;
  bidDeadline?: string;
  estimatedValueLow?: number;
  estimatedValueHigh?: number;
  summary?: string;
  whyFit?: string;
  /** Services / capabilities mentioned (e.g. Live Streaming, LED). */
  servicesMentioned: string[];
  includesLiveStreaming?: boolean;
  priority: LiveDiscoveryPriority;
};

export type LiveDiscoveryRunStatus = "running" | "completed" | "failed";

export type LiveDiscoveryRun = {
  id: string;
  organizationCompany: string;
  ownerUserId: string;
  status: LiveDiscoveryRunStatus;
  queries: string[];
  candidates: LiveDiscoveryCandidate[];
  importedOpportunityIds: string[];
  usedLiveSearch: boolean;
  usedLiveAi: boolean;
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type LiveDiscoveryProfileDoc = LiveProductionTargetProfile & {
  id: string;
  organizationCompany: string;
  updatedAt: string;
  updatedBy?: string;
};
