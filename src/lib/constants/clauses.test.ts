import { describe, expect, it } from "vitest";
import { getClausesForType } from "@/lib/constants/clauses";

function enabledIds(type: Parameters<typeof getClausesForType>[0]) {
  return getClausesForType(type, false)
    .filter((c) => c.enabled)
    .map((c) => c.id);
}

describe("payee agreement default clauses", () => {
  it("talent agreement includes appearance, likeness release, and talent-specific indemnity (not Client clauses)", () => {
    const ids = enabledIds("talent_agreement");
    expect(ids).toEqual(
      expect.arrayContaining([
        "talent_appearance",
        "talent_compensation",
        "talent_release",
        "talent_indemnity",
        "talent_cancellation",
        "limitation_liability_payee",
      ])
    );
    expect(ids).not.toContain("payment_terms");
    expect(ids).not.toContain("indemnification");
    expect(ids).not.toContain("limitation_liability");
    expect(ids).not.toContain("cancellation");
  });

  it("crew deal memo includes overtime, kit, credits, and work-for-hire", () => {
    const ids = enabledIds("contractor_agreement");
    expect(ids).toEqual(
      expect.arrayContaining([
        "contractor_services",
        "contractor_compensation",
        "contractor_overtime",
        "contractor_kit",
        "contractor_credit",
        "contractor_work_for_hire",
        "contractor_indemnity",
        "contractor_cancellation",
      ])
    );
    expect(ids).not.toContain("indemnification");
    expect(ids).not.toContain("payment_terms");
  });

  it("location agreement includes safe access, depiction, damage indemnity, and insurance", () => {
    const ids = enabledIds("location_agreement");
    expect(ids).toEqual(
      expect.arrayContaining([
        "location_use",
        "location_depiction",
        "location_compensation",
        "location_release",
        "location_producer_indemnity",
        "location_insurance",
        "location_cancellation",
      ])
    );
    expect(ids).not.toContain("indemnification");
    expect(ids).not.toContain("payment_terms");
  });

  it("does not enable generic equipment clause on talent/crew/location", () => {
    for (const type of ["talent_agreement", "contractor_agreement", "location_agreement"] as const) {
      expect(enabledIds(type)).not.toContain("equipment");
    }
  });
});
