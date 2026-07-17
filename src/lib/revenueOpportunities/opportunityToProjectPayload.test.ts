import { describe, expect, it } from "vitest";
import {
  defaultProjectName,
  estimateProjectFee,
  opportunityLocation,
} from "@/lib/revenueOpportunities/opportunityToProjectPayload";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { RevenueOpportunityProposal } from "@/lib/revenueOpportunities/types/proposal";

const opportunity = {
  id: "opp-1",
  subject: { name: "Summit Auto Gallery", city: "Orlando", state: "FL" },
  campaignConcept: { title: "Cinematic tour" },
  recommendation: { estimatedMinimumValue: 12000 },
} as RevenueOpportunity;

const proposal = {
  id: "prop-1",
  title: "Summit Auto — Brand film",
  investmentMin: 10000,
  investmentMax: 16000,
  agreementPrefill: { estimatedFee: 13000 },
} as RevenueOpportunityProposal;

describe("opportunityToProjectPayload helpers", () => {
  it("estimates fee from proposal prefill", () => {
    expect(estimateProjectFee(opportunity, proposal)).toBe(13000);
  });

  it("falls back to opportunity recommendation", () => {
    expect(estimateProjectFee(opportunity)).toBe(12000);
  });

  it("builds default project name from proposal or subject", () => {
    expect(defaultProjectName(opportunity, proposal)).toBe("Summit Auto — Brand film");
    expect(defaultProjectName(opportunity)).toBe("Summit Auto Gallery — Cinematic tour");
  });

  it("formats location from city and state", () => {
    expect(opportunityLocation(opportunity)).toBe("Orlando, FL");
  });
});
