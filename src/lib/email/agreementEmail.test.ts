import { describe, expect, it } from "vitest";
import { buildClientAgreementSendEmail } from "@/lib/email/agreementEmail";
import { Agreement } from "@/lib/types";

function clientAgreement(): Agreement {
  return {
    id: "a1",
    title: "Demo shoot",
    agreementType: "client_project",
    status: "ready_for_signature",
    paymentTerms: { totalFee: 5000, paymentStructure: "50% deposit / 50% before delivery", depositAmount: 2500, balanceAmount: 2500 },
    projectDetails: { projectName: "Brand reel" } as Agreement["projectDetails"],
    parties: [{ id: "p1", type: "client", name: "Acme", signerName: "Jane", roleInAgreement: "Client", signatureRequired: true }],
    signatures: [],
    clauses: [],
    version: 1,
    createdAt: {} as Agreement["createdAt"],
    updatedAt: {} as Agreement["updatedAt"],
  } as Agreement;
}

describe("buildClientAgreementSendEmail", () => {
  it("includes payment link for client projects when provided", () => {
    const { text, html } = buildClientAgreementSendEmail({
      agreement: clientAgreement(),
      signingUrl: "https://shootspine.com/sign/abc123",
      paymentUrl: "https://shootspine.com/pay/abc123",
      expiresAt: "Jul 1, 2026",
    });
    expect(text).toContain("https://shootspine.com/pay/abc123");
    expect(text).toContain("After you sign");
    expect(html).toContain("pay your deposit or balance by card");
  });

  it("omits payment block when no payment url", () => {
    const { text } = buildClientAgreementSendEmail({
      agreement: clientAgreement(),
      signingUrl: "https://shootspine.com/sign/abc123",
      expiresAt: "Jul 1, 2026",
    });
    expect(text).not.toContain("/pay/");
  });
});
