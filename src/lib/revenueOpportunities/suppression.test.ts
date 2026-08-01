import { describe, expect, it } from "vitest";
import { normalizeSuppressionValue } from "@/lib/revenueOpportunities/server/suppression";
import { RevenueOpportunityError } from "@/lib/revenueOpportunities/errors";

describe("normalizeSuppressionValue", () => {
  it("normalizes emails", () => {
    expect(normalizeSuppressionValue("email", " Jamie@Brand.COM ")).toBe("jamie@brand.com");
  });

  it("normalizes domains from urls or emails", () => {
    expect(normalizeSuppressionValue("domain", "https://Brand.com/path")).toBe("brand.com");
    expect(normalizeSuppressionValue("domain", "person@Brand.com")).toBe("brand.com");
  });

  it("rejects invalid values", () => {
    expect(() => normalizeSuppressionValue("email", "not-an-email")).toThrow(RevenueOpportunityError);
    expect(() => normalizeSuppressionValue("domain", "nodot")).toThrow(RevenueOpportunityError);
  });
});
