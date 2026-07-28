import { describe, it, expect } from "vitest";
import {
  buildCreatorNetworkSummary,
  computeCampaignMargin,
  filterCreators,
  rankCreatorsForBrief,
  scoreCreatorMatch,
} from "@/lib/creators/network";
import type { Creator } from "@/lib/creators/types";

function makeCreator(partial: Partial<Creator> & { id: string; professionalName: string }): Creator {
  return {
    organizationCompany: "Insight Media Group LLC",
    ownerUserId: "u1",
    relationshipType: "network",
    status: "active",
    readinessStatus: "campaign_ready",
    changeHistory: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

describe("filterCreators", () => {
  const roster = [
    makeCreator({
      id: "1",
      professionalName: "Stormi",
      primaryNiche: "lifestyle",
      location: "Miami",
      readinessStatus: "preferred",
      relationshipType: "flagship",
      platforms: [{ id: "p1", platform: "instagram", followers: 100000 }],
    }),
    makeCreator({
      id: "2",
      professionalName: "Alex",
      primaryNiche: "fitness",
      location: "Atlanta",
      readinessStatus: "needs_development",
    }),
    makeCreator({
      id: "3",
      professionalName: "Pat Applicant",
      relationshipType: "applicant",
      applicationStatus: "submitted",
      status: "inactive",
      readinessStatus: "not_reviewed",
    }),
  ];

  it("filters by niche and location", () => {
    const result = filterCreators(roster, { niches: ["lifestyle"], location: "miami" });
    expect(result.map((c) => c.id)).toEqual(["1"]);
  });

  it("filters available only", () => {
    const withUnavailable = [
      ...roster,
      makeCreator({
        id: "4",
        professionalName: "Busy",
        readinessStatus: "temporarily_unavailable",
      }),
    ];
    const result = filterCreators(withUnavailable, { availableOnly: true });
    expect(result.every((c) => c.readinessStatus !== "temporarily_unavailable")).toBe(true);
    expect(result.every((c) => c.status === "active")).toBe(true);
  });
});

describe("scoreCreatorMatch / rankCreatorsForBrief", () => {
  it("scores preferred niche+platform matches higher", () => {
    const a = makeCreator({
      id: "a",
      professionalName: "A",
      primaryNiche: "beauty",
      readinessStatus: "preferred",
      platforms: [{ id: "1", platform: "tiktok", followers: 50_000 }],
      rates: [{ id: "r1", kind: "ugc", amount: 500 }],
      documents: [
        {
          id: "d1",
          kind: "media_kit",
          url: "https://example.com/kit.pdf",
          uploadedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });
    const b = makeCreator({
      id: "b",
      professionalName: "B",
      primaryNiche: "tech",
      readinessStatus: "not_reviewed",
    });
    const scoreA = scoreCreatorMatch(a, {
      requiredNiche: "beauty",
      requiredPlatforms: ["tiktok"],
    });
    const scoreB = scoreCreatorMatch(b, {
      requiredNiche: "beauty",
      requiredPlatforms: ["tiktok"],
    });
    expect(scoreA.score).toBeGreaterThan(scoreB.score);
    expect(scoreA.reasons.some((r) => r.toLowerCase().includes("niche"))).toBe(true);
  });

  it("ranks and excludes applicants", () => {
    const ranked = rankCreatorsForBrief(
      [
        makeCreator({ id: "1", professionalName: "Good", primaryNiche: "food" }),
        makeCreator({
          id: "2",
          professionalName: "App",
          relationshipType: "applicant",
          primaryNiche: "food",
        }),
      ],
      { requiredNiche: "food" },
      5
    );
    expect(ranked.every((m) => m.creatorId !== "2")).toBe(true);
    expect(ranked[0]?.creatorId).toBe("1");
  });
});

describe("buildCreatorNetworkSummary", () => {
  it("counts active and campaign-ready, ignoring applicants in roster totals", () => {
    const summary = buildCreatorNetworkSummary([
      makeCreator({ id: "1", professionalName: "A", readinessStatus: "campaign_ready" }),
      makeCreator({ id: "2", professionalName: "B", readinessStatus: "preferred" }),
      makeCreator({
        id: "3",
        professionalName: "C",
        relationshipType: "applicant",
        applicationStatus: "submitted",
        status: "inactive",
      }),
    ]);
    expect(summary.totalActive).toBe(2);
    expect(summary.campaignReady).toBe(2);
    expect(summary.openApplications).toBe(1);
  });
});

describe("computeCampaignMargin", () => {
  it("subtracts creator pay and costs from revenue", () => {
    expect(
      computeCampaignMargin({
        clientRevenue: 10000,
        creatorCompensationTotal: 3000,
        directCosts: 2000,
      })
    ).toBe(5000);
  });
});
