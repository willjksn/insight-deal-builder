export type RevenueSuppressionKind = "email" | "domain";

export type RevenueSuppressionSource = "manual" | "inbox";

export interface RevenueSuppressionEntry {
  id: string;
  organizationCompany: string;
  ownerUserId: string;
  kind: RevenueSuppressionKind;
  /** Normalized lowercase email or domain. */
  value: string;
  reason?: string;
  source: RevenueSuppressionSource;
  createdAt: string;
  updatedAt: string;
}

export type RevenueSuppressionCreateInput = {
  kind: RevenueSuppressionKind;
  value: string;
  reason?: string;
  source?: RevenueSuppressionSource;
};
