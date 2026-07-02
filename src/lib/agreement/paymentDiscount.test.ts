import { describe, expect, it } from "vitest";
import {
  applyDiscountAmount,
  effectivePaymentTerms,
  formatPromotionSummary,
  paymentTermsDocumentLines,
  promotionSavings,
} from "@/lib/agreement/paymentDiscount";
import { PaymentTerms } from "@/lib/types";
import { buildExpectedInstallments } from "@/lib/analytics/paymentTracking";
import { installmentPayableAmount } from "@/lib/stripe/eligibility";
import { Agreement } from "@/lib/types";

const terms: PaymentTerms = {
  totalFee: 10000,
  paymentStructure: "50% deposit / 50% before final delivery",
  depositAmount: 5000,
  balanceAmount: 5000,
  discountPercent: 25,
  discountLabel: "Summer special",
};

describe("applyDiscountAmount", () => {
  it("reduces amount by percent", () => {
    expect(applyDiscountAmount(10000, 25)).toBe(7500);
    expect(applyDiscountAmount(5000, 25)).toBe(3750);
  });
});

describe("effectivePaymentTerms", () => {
  it("applies discount to fee and installments", () => {
    const effective = effectivePaymentTerms(terms);
    expect(effective.totalFee).toBe(7500);
    expect(effective.depositAmount).toBe(3750);
    expect(effective.balanceAmount).toBe(3750);
    expect(promotionSavings(terms)).toBe(2500);
  });
});

describe("buildExpectedInstallments", () => {
  it("uses discounted installment amounts", () => {
    const rows = buildExpectedInstallments(terms);
    expect(rows.find((r) => r.id === "deposit")?.amountDue).toBe(3750);
    expect(rows.find((r) => r.id === "balance")?.amountDue).toBe(3750);
  });
});

describe("installmentPayableAmount with discount", () => {
  it("charges discounted deposit on signed rental", () => {
    const agreement = {
      id: "a1",
      agreementType: "equipment_rental",
      status: "signed",
      paymentTerms: terms,
      projectDetails: {},
      parties: [],
      signatures: [],
      clauses: [],
    } as Agreement;
    expect(installmentPayableAmount(agreement, "deposit")).toBe(3750);
  });
});

describe("paymentTermsDocumentLines", () => {
  it("shows list price and amount due when discounted", () => {
    const lines = paymentTermsDocumentLines(terms, (n) => `$${n}`);
    expect(lines.some((l) => l.includes("List price"))).toBe(true);
    expect(lines.some((l) => l.includes("Amount due: $7500"))).toBe(true);
  });
});

describe("formatPromotionSummary", () => {
  it("includes label and amounts", () => {
    expect(formatPromotionSummary(terms)).toContain("Summer special");
    expect(formatPromotionSummary(terms)).toContain("$10,000");
    expect(formatPromotionSummary(terms)).toContain("$7,500");
  });
});
