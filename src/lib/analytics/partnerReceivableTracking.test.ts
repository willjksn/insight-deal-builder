import { describe, expect, it } from "vitest";
import {
  buildPartnerReceivableInstallments,
  partnerReceivableOutstanding,
  recordPartnerReceivablePayment,
  resolvePartnerReceivableInstallments,
} from "@/lib/analytics/partnerReceivableTracking";
import { PayoutDetails } from "@/lib/types";

const payout: PayoutDetails = {
  totalProjectFee: 10000,
  insightFeeAmount: 4000,
  filmFundReserveAmount: 500,
};

describe("buildPartnerReceivableInstallments", () => {
  it("includes producer fee and film fund lines", () => {
    const rows = buildPartnerReceivableInstallments(payout);
    expect(rows.map((r) => r.id)).toEqual(["reimburse:insight", "reimburse:film-fund"]);
    expect(rows[0].amountDue).toBe(4000);
    expect(rows[1].amountDue).toBe(500);
  });
});

describe("recordPartnerReceivablePayment", () => {
  it("records stripe remittance against producer fee", () => {
    const next = recordPartnerReceivablePayment(
      undefined,
      payout,
      "reimburse:insight",
      4000,
      "2026-06-30",
      "Stripe"
    );
    const rows = resolvePartnerReceivableInstallments({
      payoutDetails: payout,
      paymentTracking: next,
    });
    expect(rows[0].paidAmount).toBe(4000);
    expect(partnerReceivableOutstanding({ payoutDetails: payout, paymentTracking: next })).toBe(500);
  });
});
