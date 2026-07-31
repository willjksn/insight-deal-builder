import { describe, expect, it } from "vitest";
import { buildUnpaidPayoutLedger } from "@/lib/creators/unpaidPayoutLedger";
import type { CreatorCampaign } from "@/lib/creators/opsTypes";

function campaign(partial: Partial<CreatorCampaign> & Pick<CreatorCampaign, "id" | "name">): CreatorCampaign {
  return {
    organizationCompany: "IMG",
    ownerUserId: "u1",
    status: "in_production",
    assignments: [],
    briefs: [],
    deliverables: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("buildUnpaidPayoutLedger", () => {
  it("lists unpaid compensated assignments and skips paid/cancelled", () => {
    const campaigns = [
      campaign({
        id: "c1",
        name: "Reel A",
        assignments: [
          {
            id: "a1",
            creatorId: "cr1",
            creatorName: "Ada",
            compensation: 500,
          },
          {
            id: "a2",
            creatorId: "cr2",
            creatorName: "Bob",
            compensation: 300,
            paidAt: "2026-07-01T00:00:00.000Z",
            paidVia: "manual",
          },
        ],
      }),
      campaign({
        id: "c2",
        name: "Cancelled",
        status: "cancelled",
        assignments: [
          {
            id: "a3",
            creatorId: "cr1",
            creatorName: "Ada",
            compensation: 999,
          },
        ],
      }),
    ];

    const creatorsById = new Map([
      [
        "cr1",
        {
          stripeConnectAccountId: "acct_1",
          stripeConnect: { detailsSubmitted: true, payoutsEnabled: true },
        },
      ],
      ["cr2", {}],
    ]);

    const ledger = buildUnpaidPayoutLedger(campaigns, creatorsById);
    expect(ledger.unpaidCount).toBe(1);
    expect(ledger.unpaidTotal).toBe(500);
    expect(ledger.rows[0]?.creatorName).toBe("Ada");
    expect(ledger.rows[0]?.connectReady).toBe(true);
    expect(ledger.connectBlockedCount).toBe(0);
  });

  it("flags Connect-blocked unpaid amounts", () => {
    const campaigns = [
      campaign({
        id: "c1",
        name: "Reel A",
        assignments: [
          {
            id: "a1",
            creatorId: "cr1",
            creatorName: "Ada",
            compensation: 200,
            payoutError: "reversed",
          },
        ],
      }),
    ];
    const ledger = buildUnpaidPayoutLedger(campaigns, new Map([["cr1", {}]]));
    expect(ledger.connectBlockedCount).toBe(1);
    expect(ledger.connectBlockedTotal).toBe(200);
    expect(ledger.rows[0]?.payoutError).toBe("reversed");
  });
});
