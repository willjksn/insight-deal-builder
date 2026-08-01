import { describe, expect, it } from "vitest";
import { formatCreatorPayoutErrorForPortal } from "@/lib/creators/payoutErrorCopy";

describe("formatCreatorPayoutErrorForPortal", () => {
  it("maps staff clear and stripe reverse to friendlier copy", () => {
    expect(formatCreatorPayoutErrorForPortal("Paid record cleared by staff")).toMatch(/unpaid again/i);
    expect(
      formatCreatorPayoutErrorForPortal(
        "Staff cleared the paid record. Assignment is unpaid again — you can re-pay."
      )
    ).toMatch(/Staff cleared/i);
    expect(
      formatCreatorPayoutErrorForPortal(
        "Stripe transfer was reversed. Assignment is unpaid again — you can re-pay."
      )
    ).toMatch(/reversed/i);
  });
});
