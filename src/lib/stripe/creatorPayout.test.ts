import { describe, expect, it } from "vitest";
import { clearStripePaidFields } from "@/lib/stripe/creatorPayout";

describe("clearStripePaidFields", () => {
  it("clears paid markers and keeps audit of last transfer", () => {
    const next = clearStripePaidFields(
      {
        id: "a1",
        creatorId: "c1",
        creatorName: "Ada",
        compensation: 500,
        status: "paid",
        paidAt: "2026-07-01T00:00:00.000Z",
        paidAmount: 500,
        paidVia: "stripe",
        stripeTransferId: "tr_123",
        paidByUserId: "u1",
      },
      "tr_123",
      "reversed"
    );
    expect(next.paidAt).toBeUndefined();
    expect(next.stripeTransferId).toBeUndefined();
    expect(next.paidVia).toBeUndefined();
    expect(next.lastStripeTransferId).toBe("tr_123");
    expect(next.payoutError).toBe("reversed");
    expect(next.status).toBe("assigned");
    expect(next.compensation).toBe(500);
  });
});
