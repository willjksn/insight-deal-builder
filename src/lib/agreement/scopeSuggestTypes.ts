import { AgreementType, GearPackageName, ProjectType, ShootType } from "@/lib/types";

export type QuoteScopeDeliverable = {
  name: string;
  quantity: number;
};

export type QuoteScopeSuggestion = {
  agreementType: AgreementType;
  recommendedPackageId: string | null;
  recommendedPackageName: string | null;
  projectName: string;
  projectType: ProjectType;
  shootType: ShootType;
  projectOverview: string;
  projectGoals: string[];
  location?: string;
  shootTime?: string;
  estimatedTotalFee: number;
  deliverables: QuoteScopeDeliverable[];
  suggestedGearPackage: GearPackageName | null;
  insightGearUsed: boolean;
  rationale: string;
  checklist: string[];
};
