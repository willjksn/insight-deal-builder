import { describe, expect, it } from "vitest";
import {
  buildContentPlanPitchHref,
  encodeDeliverablesForQuery,
  parseDeliverablesFromQuery,
} from "@/lib/contentPlan/pitchPrefill";

describe("pitchPrefill", () => {
  it("builds a pitch href with commercial ids", () => {
    const href = buildContentPlanPitchHref({
      packageId: "pkg1",
      packageName: "Business Reel Package",
      clientName: "Acme",
      agreementId: "agr1",
      opportunityId: "opp1",
      businessContext: "Dental clinic",
    });
    expect(href).toContain("/content-plans/pitch?");
    expect(href).toContain("packageId=pkg1");
    expect(href).toContain("agreementId=agr1");
    expect(href).toContain("opportunityId=opp1");
  });

  it("round-trips deliverables json", () => {
    const json = encodeDeliverablesForQuery([
      { name: "Edited reels", quantity: 10 },
      { name: "Cinematic promos", quantity: 3 },
    ]);
    expect(parseDeliverablesFromQuery(json)).toEqual([
      { name: "Edited reels", quantity: 10 },
      { name: "Cinematic promos", quantity: 3 },
    ]);
  });
});
