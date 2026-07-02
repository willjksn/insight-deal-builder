import { describe, expect, it } from "vitest";
import { Agreement, PaymentTerms } from "@/lib/types";
import {
  agreementAcceptsStripePayments,
  dollarsToCents,
  installmentPayableAmount,
} from "@/lib/stripe/eligibility";

function clientAgreement(overrides: Partial<Agreement> = {}): Agreement {
  const paymentTerms: PaymentTerms = {
    totalFee: 5000,
    paymentStructure: "50% deposit / 50% before delivery",
    depositAmount: 2500,
    balanceAmount: 2500,
  };
  return {
    id: "a1",
    title: "Test deal",
    agreementType: "client_project",
    status: "signed",
    paymentTerms,
    projectDetails: { projectName: "Demo" } as Agreement["projectDetails"],
    parties: [],
    signatures: [],
    clauses: [],
    version: 1,
    createdAt: {} as Agreement["createdAt"],
    updatedAt: {} as Agreement["updatedAt"],
    ...overrides,
  } as Agreement;
}

describe("agreementAcceptsStripePayments", () => {
  it("allows signed client projects with a fee", () => {
    expect(agreementAcceptsStripePayments(clientAgreement())).toBe(true);
  });

  it("blocks internal collaboration", () => {
    expect(
      agreementAcceptsStripePayments(
        clientAgreement({ agreementType: "internal_collaboration" })
      )
    ).toBe(false);
  });
});

describe("installmentPayableAmount", () => {
  it("returns outstanding deposit", () => {
    expect(installmentPayableAmount(clientAgreement(), "deposit")).toBe(2500);
  });

  it("returns null when installment is paid", () => {
    const paid = clientAgreement({
      paymentTracking: {
        installments: [
          {
            id: "deposit",
            label: "Deposit",
            amountDue: 2500,
            paidAmount: 2500,
            paidAt: "2026-01-01",
          },
          {
            id: "balance",
            label: "Balance",
            amountDue: 2500,
            paidAmount: 0,
          },
        ],
      },
    });
    expect(installmentPayableAmount(paid, "deposit")).toBeNull();
    expect(installmentPayableAmount(paid, "balance")).toBe(2500);
  });
});

describe("dollarsToCents", () => {
  it("rounds to cents", () => {
    expect(dollarsToCents(2500)).toBe(250000);
    expect(dollarsToCents(99.995)).toBe(10000);
  });
});
