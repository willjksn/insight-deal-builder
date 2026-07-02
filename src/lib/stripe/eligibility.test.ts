import { describe, expect, it } from "vitest";
import { Agreement, PaymentTerms, PayoutDetails } from "@/lib/types";
import {
  agreementAcceptsStripePayments,
  dollarsToCents,
  getStripePaymentKind,
  installmentPayableAmount,
  partyCanPayViaStripe,
} from "@/lib/stripe/eligibility";

function clientAgreement(overrides: Partial<Agreement> = {}): Agreement {
  const paymentTerms: PaymentTerms = {
    totalFee: 5000,
    paymentStructure: "50% deposit / 50% before final delivery",
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
    parties: [
      {
        id: "p1",
        type: "client",
        name: "Acme",
        signerName: "Jane",
        roleInAgreement: "Client",
        signatureRequired: true,
      },
    ],
    signatures: [],
    clauses: [],
    version: 1,
    createdAt: {} as Agreement["createdAt"],
    updatedAt: {} as Agreement["updatedAt"],
    ...overrides,
  } as Agreement;
}

function rentalAgreement(overrides: Partial<Agreement> = {}): Agreement {
  return clientAgreement({
    agreementType: "equipment_rental",
    title: "Gear rental",
    parties: [
      {
        id: "owner",
        type: "company",
        name: "Insight Media Group LLC",
        signerName: "Will",
        roleInAgreement: "Owner",
        signatureRequired: true,
      },
      {
        id: "renter",
        type: "company",
        name: "Renter Co",
        signerName: "Alex",
        roleInAgreement: "Renter",
        signatureRequired: true,
      },
    ],
    ...overrides,
  });
}

function internalAgreement(overrides: Partial<Agreement> = {}): Agreement {
  const payoutDetails: PayoutDetails = {
    totalProjectFee: 10000,
    insightFeeAmount: 4000,
    insightFeePercentage: 40,
    aveFeeAmount: 6000,
  };
  return clientAgreement({
    agreementType: "internal_collaboration",
    paymentTerms: { totalFee: 0, paymentStructure: "Custom" },
    payoutDetails,
    parties: [
      {
        id: "img",
        type: "company",
        name: "Insight Media Group LLC",
        signerName: "Will",
        roleInAgreement: "Production Company",
        signatureRequired: true,
      },
      {
        id: "partner",
        type: "company",
        name: "Partner LLC",
        signerName: "Pat",
        roleInAgreement: "Collaborator",
        signatureRequired: true,
      },
    ],
    ...overrides,
  });
}

describe("getStripePaymentKind", () => {
  it("allows signed client projects with a fee", () => {
    expect(getStripePaymentKind(clientAgreement())).toBe("client_payment");
  });

  it("allows signed equipment rentals with a fee", () => {
    expect(getStripePaymentKind(rentalAgreement())).toBe("client_payment");
  });

  it("allows signed internal deals with producer fee remittance", () => {
    expect(getStripePaymentKind(internalAgreement())).toBe("partner_reimburse");
  });

  it("blocks internal collaboration without payout", () => {
    expect(
      getStripePaymentKind(internalAgreement({ payoutDetails: undefined }))
    ).toBeNull();
  });
});

describe("agreementAcceptsStripePayments", () => {
  it("allows signed client projects with a fee", () => {
    expect(agreementAcceptsStripePayments(clientAgreement())).toBe(true);
  });

  it("blocks internal collaboration without receivable", () => {
    expect(
      agreementAcceptsStripePayments(
        internalAgreement({
          payoutDetails: { totalProjectFee: 10000, insightFeeAmount: 0 },
        })
      )
    ).toBe(false);
  });
});

describe("partyCanPayViaStripe", () => {
  it("allows client on client project", () => {
    const agreement = clientAgreement();
    expect(partyCanPayViaStripe(agreement, agreement.parties[0])).toBe(true);
  });

  it("allows renter on equipment rental", () => {
    const agreement = rentalAgreement();
    const renter = agreement.parties.find((p) => p.roleInAgreement === "Renter")!;
    expect(partyCanPayViaStripe(agreement, renter)).toBe(true);
  });

  it("allows collaborator on internal deal", () => {
    const agreement = internalAgreement();
    const partner = agreement.parties.find((p) => p.roleInAgreement === "Collaborator")!;
    expect(partyCanPayViaStripe(agreement, partner)).toBe(true);
  });
});

describe("installmentPayableAmount", () => {
  it("returns outstanding deposit on client project", () => {
    expect(installmentPayableAmount(clientAgreement(), "deposit")).toBe(2500);
  });

  it("returns producer fee remittance on internal deal", () => {
    expect(installmentPayableAmount(internalAgreement(), "reimburse:insight")).toBe(4000);
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
