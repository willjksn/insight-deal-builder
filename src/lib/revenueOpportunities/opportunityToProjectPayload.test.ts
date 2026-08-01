import { describe, expect, it } from "vitest";
import {
  buildRevenueHandoffNotes,
  buildScopeChecklistNotes,
  defaultProjectName,
  estimateProjectFee,
  extractTimelineDates,
  inferProjectType,
  inferShootType,
  opportunityLocation,
  opportunityToProjectBackfill,
} from "@/lib/revenueOpportunities/opportunityToProjectPayload";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { RevenueOpportunityProposal } from "@/lib/revenueOpportunities/types/proposal";

const opportunity = {
  id: "opp-1",
  opportunityType: "img_client",
  subject: { name: "Summit Auto Gallery", city: "Orlando", state: "FL" },
  campaignConcept: {
    title: "Cinematic tour",
    hook: "A night drive through the showroom",
    recommendedDeliverables: ["60s hero film", "3 reels"],
    estimatedProductionDays: 2,
  },
  recommendation: {
    estimatedMinimumValue: 12000,
    serviceName: "Business Reel Package",
  },
  contact: { name: "Jamie Lee", email: "jamie@summit.test", title: "Marketing" },
} as RevenueOpportunity;

const proposal = {
  id: "prop-1",
  title: "Summit Auto — Brand film",
  investmentMin: 10000,
  investmentMax: 16000,
  deliverables: ["Hero film", "Social cutdowns"],
  timelineNotes: "Shoot 2026-08-12 on site. Delivery / final due 2026-08-28.",
  agreementPrefill: {
    suggestedTitle: "Summit Auto — Brand film",
    projectOverview: "Cinematic showroom tour for launch week.",
    deliverables: ["Hero film", "Social cutdowns"],
    estimatedFee: 13000,
  },
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

  it("infers project and shoot types from reel/service signals", () => {
    expect(inferProjectType(opportunity, proposal)).toBe("Business Reel Package");
    expect(inferShootType(opportunity, proposal)).toBe("Cinematic Commercial");
  });

  it("infers creator-led type for stormi brand opportunities", () => {
    expect(
      inferProjectType({
        ...opportunity,
        opportunityType: "stormi_brand",
      } as RevenueOpportunity)
    ).toBe("Creator-Led Brand Campaign");
  });

  it("extracts shoot and delivery dates from timeline notes", () => {
    expect(extractTimelineDates(proposal.timelineNotes)).toEqual({
      shootDate: "2026-08-12",
      deliveryDate: "2026-08-28",
    });
  });

  it("builds handoff notes and scope checklist text", () => {
    const notes = buildRevenueHandoffNotes(opportunity, proposal);
    expect(notes).toContain("Cinematic showroom tour");
    expect(notes).toContain("Hero film");
    expect(notes).toContain("Jamie Lee");

    const scope = buildScopeChecklistNotes(opportunity, proposal);
    expect(scope).toContain("13,000");
    expect(scope).toContain("2026-08-12");
  });

  it("backfills empty project fields without wiping filled ones", () => {
    const patch = opportunityToProjectBackfill({
      opportunity,
      proposal,
      existing: {
        projectName: "Keep me",
        totalProjectFee: 0,
        shootDate: "",
        location: "",
        projectType: "Business Brand Package",
        shootType: "Photo + Video",
      },
    });
    expect(patch.projectName).toBeUndefined();
    expect(patch.totalProjectFee).toBe(13000);
    expect(patch.shootDate).toBe("2026-08-12");
    expect(patch.location).toBe("Orlando, FL");
    expect(patch.projectType).toBe("Business Reel Package");
  });
});
