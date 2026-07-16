import { describe, expect, it } from "vitest";
import { validateCampaignCreate, validateOpportunityCreate } from "@/lib/revenueOpportunities/validate";

describe("validateCampaignCreate", () => {
  it("requires campaign name", () => {
    expect(() => validateCampaignCreate({})).toThrow("Campaign name is required");
  });

  it("normalizes IMG campaign defaults", () => {
    const result = validateCampaignCreate({
      name: " Orlando hotels ",
      campaignType: "img_client",
      opportunityCountRequested: 999,
      minOpportunityScore: 150,
    });
    expect(result.name).toBe("Orlando hotels");
    expect(result.campaignType).toBe("img_client");
    expect(result.opportunityCountRequested).toBe(50);
    expect(result.minOpportunityScore).toBe(100);
    expect(result.approvalMode).toBe("manual_review");
  });

  it("accepts stormi campaign type", () => {
    const result = validateCampaignCreate({ name: "Beauty brands", campaignType: "stormi_brand" });
    expect(result.campaignType).toBe("stormi_brand");
  });
});

describe("validateOpportunityCreate", () => {
  it("requires subject name", () => {
    expect(() => validateOpportunityCreate({ subject: {} })).toThrow("Subject name is required");
  });

  it("builds workflow defaults for manual entry", () => {
    const result = validateOpportunityCreate({
      subject: { name: "Test Spa" },
      pipelineStage: "new",
    });
    expect(result.subject.name).toBe("Test Spa");
    expect(result.workflow.pipelineStage).toBe("new");
    expect(result.workflow.approvalStatus).toBe("pending");
    expect(result.opportunityType).toBe("img_client");
  });
});
