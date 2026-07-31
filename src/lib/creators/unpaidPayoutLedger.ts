import { isStripeConnectReady } from "@/lib/creators/types";
import type { CreatorCampaign } from "@/lib/creators/opsTypes";

export type UnpaidPayoutLedgerRow = {
  campaignId: string;
  campaignName: string;
  brandName?: string;
  campaignStatus: string;
  assignmentId: string;
  creatorId: string;
  creatorName: string;
  role?: string;
  compensation: number;
  connectReady: boolean;
  payoutError?: string;
};

export type UnpaidPayoutLedger = {
  rows: UnpaidPayoutLedgerRow[];
  unpaidCount: number;
  unpaidTotal: number;
  connectBlockedCount: number;
  connectBlockedTotal: number;
};

/** Assignments with compensation that are not marked paid. */
export function buildUnpaidPayoutLedger(
  campaigns: CreatorCampaign[],
  creatorsById: Map<
    string,
    {
      stripeConnectAccountId?: string;
      stripeConnect?: {
        detailsSubmitted?: boolean;
        payoutsEnabled?: boolean;
      };
    }
  >
): UnpaidPayoutLedger {
  const rows: UnpaidPayoutLedgerRow[] = [];

  for (const campaign of campaigns) {
    if (campaign.status === "cancelled") continue;
    for (const a of campaign.assignments ?? []) {
      const alreadyPaid = Boolean(a.paidAt || a.stripeTransferId);
      if (alreadyPaid) continue;
      if (typeof a.compensation !== "number" || !Number.isFinite(a.compensation) || a.compensation <= 0) {
        continue;
      }
      const creator = creatorsById.get(a.creatorId);
      const connectReady = isStripeConnectReady(creator);
      rows.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        brandName: campaign.brandName,
        campaignStatus: campaign.status,
        assignmentId: a.id,
        creatorId: a.creatorId,
        creatorName: a.creatorName,
        role: a.role,
        compensation: a.compensation,
        connectReady,
        payoutError: a.payoutError,
      });
    }
  }

  rows.sort((a, b) => {
    if (b.compensation !== a.compensation) return b.compensation - a.compensation;
    return a.creatorName.localeCompare(b.creatorName);
  });

  const unpaidTotal = rows.reduce((sum, r) => sum + r.compensation, 0);
  const blocked = rows.filter((r) => !r.connectReady);
  const connectBlockedTotal = blocked.reduce((sum, r) => sum + r.compensation, 0);

  return {
    rows,
    unpaidCount: rows.length,
    unpaidTotal,
    connectBlockedCount: blocked.length,
    connectBlockedTotal,
  };
}
