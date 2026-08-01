import { describe, expect, it } from "vitest";
import {
  buildProductionBoardHandoff,
  mergeBoardHandoffIntoExisting,
} from "@/lib/revenueOpportunities/revenueProjectHandoff";
import type { RevenueOpportunity } from "@/lib/revenueOpportunities/types/opportunity";
import type { RevenueOpportunityProposal } from "@/lib/revenueOpportunities/types/proposal";
import type { Project } from "@/lib/types";
import type { ProductionBoard } from "@/lib/production/types";
import { Timestamp } from "firebase/firestore";

const project = {
  id: "proj-1",
  projectName: "Summit Auto — Brand film",
  agreementType: "client_project",
  projectType: "Business Reel Package",
  shootType: "Photo + Video",
  totalProjectFee: 13000,
  location: "Orlando, FL",
  status: "draft",
} as Project;

const opportunity = {
  id: "opp-1",
  opportunityType: "img_client",
  subject: { name: "Summit Auto Gallery", city: "Orlando", state: "FL", address: "100 Main" },
  campaignConcept: {
    hook: "Night drive through the showroom",
    storyDirection: "Cool blue grade, slow push-ins",
    estimatedProductionDays: 2,
    recommendedDeliverables: ["60s hero"],
  },
  contact: { name: "Jamie", email: "jamie@test.com", title: "Marketing" },
} as RevenueOpportunity;

const proposal = {
  id: "prop-1",
  title: "Summit",
  executiveSummary: "Launch film",
  deliverables: ["Hero"],
  timelineNotes: "Shoot 2026-09-01. Delivery 2026-09-15.",
  agreementPrefill: {
    suggestedTitle: "Summit",
    projectOverview: "Launch film overview",
    deliverables: ["Hero"],
    estimatedFee: 13000,
  },
} as RevenueOpportunityProposal;

describe("revenueProjectHandoff", () => {
  it("seeds prep board with brief, location, contact, and days", () => {
    const { board, summary } = buildProductionBoardHandoff({
      project,
      ownerUserId: "u1",
      opportunity,
      proposal,
    });
    expect(board.logline).toContain("Night drive");
    expect(board.lookAndFeel).toContain("Cool blue");
    expect(board.filmingNotes).toContain("From revenue opportunity");
    expect(board.locations?.[0]?.name).toContain("Orlando");
    expect(board.people?.[0]?.email).toBe("jamie@test.com");
    expect(board.productionDays).toHaveLength(2);
    expect(board.productionDays[0].shootDate).toBe("2026-09-01");
    expect(summary.filmingNotes).toBe(true);
    expect(summary.contactPerson).toBe(true);
    const scope = board.checklistItems?.find((i) => i.stepKey === "scope");
    expect(scope?.notes).toContain("13,000");
  });

  it("merges into existing board without overwriting filled fields", () => {
    const { board: handoff } = buildProductionBoardHandoff({
      project,
      ownerUserId: "u1",
      opportunity,
      proposal,
    });
    const existing = {
      id: "board-1",
      projectId: "proj-1",
      userId: "u1",
      logline: "Already set",
      lookAndFeel: "",
      filmingNotes: "",
      people: [],
      storyLinks: [],
      inspirationImages: [],
      locations: [],
      gearItems: [],
      productionDays: [
        {
          id: "d1",
          title: "Day 1",
          dayNumber: 1,
          shootDate: "",
          scenes: [],
          schedule: [],
          shots: [],
          sceneFrames: [],
        },
      ],
      linkedScoutProjectIds: [],
      checklistItems: [
        {
          id: "scope",
          stepKey: "scope",
          label: "Deal & scope",
          phase: "prepro_creative",
          sortOrder: 10,
          done: false,
        },
      ],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    } as ProductionBoard;

    const patch = mergeBoardHandoffIntoExisting(existing, handoff);
    expect(patch.logline).toBeUndefined();
    expect(patch.lookAndFeel).toContain("Cool blue");
    expect(patch.filmingNotes).toContain("revenue");
    expect(patch.productionDays).toHaveLength(2);
    expect(patch.checklistItems?.[0]?.notes).toBeTruthy();
  });
});
