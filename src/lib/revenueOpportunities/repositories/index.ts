import type { Firestore } from "firebase-admin/firestore";
import type { RevenueTenantScope } from "@/lib/revenueOpportunities/types";

/** Base list query for tenant-scoped Revenue collections. */
export interface RevenueListQuery {
  organizationCompany: string;
  limit?: number;
  cursor?: string;
}

export interface RevenueRepository<T, TCreate, TUpdate> {
  getById(id: string, scope: RevenueTenantScope): Promise<T | null>;
  list(query: RevenueListQuery): Promise<T[]>;
  create(data: TCreate, scope: RevenueTenantScope): Promise<T>;
  update(id: string, data: TUpdate, scope: RevenueTenantScope): Promise<T>;
  delete(id: string, scope: RevenueTenantScope): Promise<void>;
}

export type RevenueDb = Firestore;

/** Resolve tenant scope from authenticated ShootSpine user. */
export function revenueScopeFromUser(userId: string, company: string): RevenueTenantScope {
  return {
    ownerUserId: userId,
    organizationCompany: company,
  };
}

/** Campaign repository — implemented in Phase 2. */
export interface RevenueCampaignRecord {
  id: string;
  organizationCompany: string;
  ownerUserId: string;
  name: string;
  campaignType: "img_client" | "stormi_brand";
  status: string;
  createdAt: string;
  updatedAt: string;
}

export type CampaignRepository = RevenueRepository<
  RevenueCampaignRecord,
  Omit<RevenueCampaignRecord, "id" | "createdAt" | "updatedAt">,
  Partial<Omit<RevenueCampaignRecord, "id" | "organizationCompany" | "ownerUserId" | "createdAt">>
>;

/** Opportunity repository — implemented in Phase 2. */
export interface RevenueOpportunityRecord {
  id: string;
  organizationCompany: string;
  ownerUserId: string;
  campaignId?: string;
  opportunityType: "img_client" | "stormi_brand";
  subjectName: string;
  pipelineStage: string;
  createdAt: string;
  updatedAt: string;
}

export type OpportunityRepository = RevenueRepository<
  RevenueOpportunityRecord,
  Omit<RevenueOpportunityRecord, "id" | "createdAt" | "updatedAt">,
  Partial<Omit<RevenueOpportunityRecord, "id" | "organizationCompany" | "ownerUserId" | "createdAt">>
>;

/** Project conversion — calls existing ShootSpine project service in Phase 8. */
export interface ConvertOpportunityToProjectInput {
  opportunityId: string;
  projectName?: string;
}

export interface ConvertOpportunityToProjectResult {
  projectId: string;
  opportunityId: string;
}

export interface ProjectConversionService {
  convert(input: ConvertOpportunityToProjectInput, scope: RevenueTenantScope): Promise<ConvertOpportunityToProjectResult>;
}
