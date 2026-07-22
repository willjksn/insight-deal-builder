import type {
  RevenueMeetingStatus,
  RevenueMeetingType,
} from "@/lib/revenueOpportunities/types/meeting";

export const MEETING_TYPE_LABELS: Record<RevenueMeetingType, string> = {
  discovery: "Discovery call",
  sales: "Sales",
  production: "Production",
  internal: "Internal",
  other: "Other",
};

export const MEETING_STATUS_LABELS: Record<RevenueMeetingStatus, string> = {
  draft: "Draft",
  transcribing: "Transcribing",
  transcribed: "Transcribed",
  analyzed: "Analyzed",
  failed: "Failed",
};

export const MEETING_EXTRACTION_FIELD_LABELS: Record<string, string> = {
  nextAction: "Next action",
  followUpAt: "Follow-up date",
  budget: "Budget",
  timeline: "Timeline",
  decisionMaker: "Decision maker",
  painPoint: "Pain point",
  scope: "Scope",
};
