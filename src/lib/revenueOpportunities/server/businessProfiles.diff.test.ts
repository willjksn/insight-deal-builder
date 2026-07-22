import { describe, expect, it } from "vitest";
import { diffProfileChanges } from "@/lib/revenueOpportunities/server/businessProfiles";
import type { BusinessProfile } from "@/lib/revenueOpportunities/types/businessProfile";

const base: Pick<BusinessProfile, "name" | "profileType" | "status" | "fields"> = {
  name: "Insight Media Group",
  profileType: "img",
  status: "active",
  fields: {
    description: "Cinematic production",
    services: ["Brand films", "Reels"],
    minimumProjectValue: 2500,
    remoteEligible: false,
  },
};

const actor = { userId: "u1", displayName: "Owner" };
const at = "2026-07-21T00:00:00.000Z";

describe("diffProfileChanges", () => {
  it("returns no entries when nothing changes", () => {
    const entries = diffProfileChanges(base, {}, actor, at);
    expect(entries).toHaveLength(0);
  });

  it("records top-level and field changes with before/after values", () => {
    const entries = diffProfileChanges(
      base,
      { name: "IMG", fields: { description: "New cinematic production" } },
      actor,
      at
    );
    const fields = entries.map((e) => e.field);
    expect(fields).toContain("name");
    expect(fields).toContain("description");

    const nameEntry = entries.find((e) => e.field === "name")!;
    expect(nameEntry.previousValue).toBe("Insight Media Group");
    expect(nameEntry.newValue).toBe("IMG");
    expect(nameEntry.changedByDisplayName).toBe("Owner");
    expect(nameEntry.source).toBe("manual");
  });

  it("serializes arrays and booleans and detects list changes", () => {
    const entries = diffProfileChanges(
      base,
      { fields: { services: ["Brand films", "Reels", "Photo"], remoteEligible: true } },
      actor,
      at
    );
    const services = entries.find((e) => e.field === "services")!;
    expect(services.previousValue).toBe("Brand films, Reels");
    expect(services.newValue).toBe("Brand films, Reels, Photo");

    const remote = entries.find((e) => e.field === "remoteEligible")!;
    expect(remote.previousValue).toBe("no");
    expect(remote.newValue).toBe("yes");
  });

  it("does not record a change when a list is reordered to the same values", () => {
    const entries = diffProfileChanges(
      base,
      { fields: { services: ["Brand films", "Reels"] } },
      actor,
      at
    );
    expect(entries.find((e) => e.field === "services")).toBeUndefined();
  });

  it("records clearing a value", () => {
    const entries = diffProfileChanges(base, { fields: { description: "" } }, actor, at);
    const desc = entries.find((e) => e.field === "description")!;
    expect(desc.previousValue).toBe("Cinematic production");
    expect(desc.newValue).toBeUndefined();
  });
});
