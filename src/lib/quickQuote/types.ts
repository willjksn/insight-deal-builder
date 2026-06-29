import { ProjectType, ShootType } from "@/lib/types";

export interface QuickQuoteDeliverable {
  name: string;
  quantity: number;
}

/** Lightweight client estimate — not a binding agreement until promoted. */
export interface QuickQuoteDraft {
  clientId?: string;
  clientName?: string;
  projectName: string;
  jobDescription: string;
  city?: string;
  state?: string;
  zip?: string;
  location?: string;
  projectType: ProjectType;
  shootType: ShootType;
  proposedFee: number;
  marketFeeLow?: number;
  marketFeeHigh?: number;
  deliverables: QuickQuoteDeliverable[];
  scopeOverview?: string;
  marketSummary?: string;
  internalNotes?: string;
}

export const QUICK_QUOTE_STORAGE_KEY = "insightQuickQuoteDraft";

export const emptyQuickQuoteDraft = (): QuickQuoteDraft => ({
  clientName: "",
  projectName: "",
  jobDescription: "",
  city: "",
  state: "NC",
  zip: "",
  location: "",
  projectType: "Business Brand Package",
  shootType: "Photo + Video",
  proposedFee: 0,
  deliverables: [],
  scopeOverview: "",
  marketSummary: "",
  internalNotes: "",
});
