import { describe, expect, it } from "vitest";
import {
  creatorCatalogNotes,
  formatLocationCatalogLabel,
  locationCatalogNotes,
} from "@/lib/contentPlan/catalogPickers";
import type { Creator } from "@/lib/creators/types";
import type { LocationCatalogItem } from "@/lib/types";

describe("catalogPickers", () => {
  it("formats location labels and notes", () => {
    const loc = {
      id: "l1",
      propertyName: "Loft 12",
      propertyAddress: "123 Main",
      notes: "Quiet after 8pm",
      propPresets: ["Couch", "Plant"],
      locationFee: 0,
      locationFeeType: "flat",
      active: true,
      createdAt: "",
      updatedAt: "",
    } as LocationCatalogItem;
    expect(formatLocationCatalogLabel(loc)).toBe("Loft 12 — 123 Main");
    expect(locationCatalogNotes(loc)).toContain("Quiet after 8pm");
    expect(locationCatalogNotes(loc)).toContain("Couch");
  });

  it("summarizes creator catalog notes", () => {
    const creator = {
      id: "c1",
      professionalName: "Stormi",
      relationshipType: "flagship",
      primaryNiche: "Beauty",
      status: "active",
    } as Creator;
    expect(creatorCatalogNotes(creator)).toContain("Beauty");
    expect(creatorCatalogNotes(creator)).toContain("flagship");
  });
});
