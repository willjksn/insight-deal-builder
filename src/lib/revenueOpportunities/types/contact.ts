export type RevenueContactSource = "manual" | "opportunity" | "agent";

export interface RevenueContact {
  id: string;
  organizationCompany: string;
  ownerUserId: string;
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  companyName?: string;
  linkedInUrl?: string;
  notes?: string;
  /** Opportunities this contact has been linked to. */
  opportunityIds: string[];
  clientId?: string;
  source: RevenueContactSource;
  createdAt: string;
  updatedAt: string;
}

export type RevenueContactCreateInput = {
  name: string;
  email?: string;
  phone?: string;
  title?: string;
  companyName?: string;
  linkedInUrl?: string;
  notes?: string;
  opportunityId?: string;
  clientId?: string;
  source?: RevenueContactSource;
};

export type RevenueContactUpdateInput = Partial<{
  name: string;
  email: string;
  phone: string;
  title: string;
  companyName: string;
  linkedInUrl: string;
  notes: string;
  clientId: string;
}>;
