import { describe, expect, it } from "vitest";
import { CREATOR_NETWORK_AGREEMENT_VERSION } from "@/lib/creators/networkAgreementContent";
import {
  formatCampaignLiveStatusWarning,
  formatCreatorAssignGapWarning,
  getCampaignLiveStatusGaps,
  getCreatorCampaignAssignGaps,
  isCreatorCampaignLiveStatus,
} from "@/lib/creators/onboardingGate";

describe("getCreatorCampaignAssignGaps", () => {
  it("flags agreement, identity, and payment when empty", () => {
    const gaps = getCreatorCampaignAssignGaps({
      professionalName: "Ada",
    });
    expect(gaps.map((g) => g.id)).toEqual(["agreement", "identity", "payment"]);
  });

  it("clears payment when Stripe Connect is ready", () => {
    const gaps = getCreatorCampaignAssignGaps({
      professionalName: "Ada",
      networkAgreement: {
        status: "signed",
        version: CREATOR_NETWORK_AGREEMENT_VERSION,
        signedAt: "2026-07-01T00:00:00.000Z",
        signerName: "Ada",
        signerEmail: "ada@example.com",
        typedSignature: "Ada",
      },
      identityVerification: { status: "approved" },
      stripeConnectAccountId: "acct_123",
      stripeConnect: {
        detailsSubmitted: true,
        payoutsEnabled: true,
      },
    });
    expect(gaps).toEqual([]);
  });

  it("notes incomplete Connect when account exists but not ready", () => {
    const gaps = getCreatorCampaignAssignGaps({
      professionalName: "Ada",
      networkAgreement: {
        status: "signed",
        version: CREATOR_NETWORK_AGREEMENT_VERSION,
        signedAt: "2026-07-01T00:00:00.000Z",
        signerName: "Ada",
        signerEmail: "ada@example.com",
        typedSignature: "Ada",
      },
      identityVerification: { status: "approved" },
      stripeConnectAccountId: "acct_123",
      stripeConnect: { detailsSubmitted: false, payoutsEnabled: false },
    });
    expect(gaps).toEqual([
      {
        id: "payment",
        label: "Stripe Connect onboarding incomplete",
      },
    ]);
  });
});

describe("formatCreatorAssignGapWarning", () => {
  it("joins gap labels", () => {
    const text = formatCreatorAssignGapWarning("Ada", [
      { id: "payment", label: "Stripe Connect not set up" },
    ]);
    expect(text).toContain("Ada");
    expect(text).toContain("Stripe Connect not set up");
    expect(text).toContain("still assign");
  });
});

describe("campaign live status soft-gate", () => {
  it("treats agreed / in_production / posting / reporting as live", () => {
    expect(isCreatorCampaignLiveStatus("agreed")).toBe(true);
    expect(isCreatorCampaignLiveStatus("in_production")).toBe(true);
    expect(isCreatorCampaignLiveStatus("draft")).toBe(false);
    expect(isCreatorCampaignLiveStatus("completed")).toBe(false);
  });

  it("lists assignees with gaps", () => {
    const rows = getCampaignLiveStatusGaps(
      [
        { creatorId: "c1", creatorName: "Ada" },
        { creatorId: "c2", creatorName: "Bob" },
      ],
      new Map([
        [
          "c2",
          {
            professionalName: "Bob",
            networkAgreement: {
              status: "signed",
              version: CREATOR_NETWORK_AGREEMENT_VERSION,
              signedAt: "2026-07-01T00:00:00.000Z",
            },
            identityVerification: { status: "approved" },
            stripeConnectAccountId: "acct_1",
            stripeConnect: { detailsSubmitted: true, payoutsEnabled: true },
          },
        ],
      ])
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].creatorName).toBe("Ada");
    expect(formatCampaignLiveStatusWarning("In production", rows)).toContain("Ada");
    expect(formatCampaignLiveStatusWarning("In production", rows)).toContain("still update");
  });
});
