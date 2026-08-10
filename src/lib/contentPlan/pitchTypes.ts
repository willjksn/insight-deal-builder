import type { PackageDeliverable } from "@/lib/types";
import type { ContentStyle } from "@/lib/contentPlan/types";

/** Max one-liners generated in a single AI call. */
export const PITCH_BATCH_CAP = 15;

export type ContentPlanPitchIdea = {
  id: string;
  /** Short pitch line for the client. */
  oneLiner: string;
  /** Optional working title. */
  title?: string;
  /** Deliverable label from the package (e.g. "Edited reels"). */
  deliverableName: string;
  /** Suggested content style for the plan wizard. */
  contentStyleHint?: ContentStyle;
  contentPlanId?: string | null;
  status?: "new" | "developed" | "dismissed";
};

export type ContentPlanPitchSession = {
  id: string;
  userId: string;
  packageId?: string | null;
  packageName: string;
  deliverables: PackageDeliverable[];
  clientName: string;
  businessContext: string;
  brand?: string;
  product?: string;
  /** Commercial provenance (optional). */
  agreementId?: string | null;
  opportunityId?: string | null;
  proposalId?: string | null;
  clientId?: string | null;
  ideas: ContentPlanPitchIdea[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type PitchDeliverableTarget = {
  deliverableName: string;
  /** How many more ideas of this type to generate in this batch. */
  count: number;
};
