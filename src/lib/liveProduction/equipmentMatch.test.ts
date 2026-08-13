import { describe, expect, it } from "vitest";
import type { EquipmentCatalogItem } from "@/lib/types";
import { matchEquipmentRequirements } from "./equipmentMatch";
import type { LiveEquipmentRequirement } from "./types";

const catalog = [
  {
    id: "1",
    name: "LED Video Wall",
    category: "LED",
    quantityOwned: 1,
    dailyRate: 2500,
    active: true,
  },
  {
    id: "2",
    name: "Wireless Mic Kit",
    category: "Audio",
    quantityOwned: 8,
    dailyRate: 40,
    active: true,
  },
  {
    id: "3",
    name: "Digital Audio Console",
    category: "Audio",
    quantityOwned: 1,
    dailyRate: 350,
    active: true,
  },
] as EquipmentCatalogItem[];

describe("matchEquipmentRequirements", () => {
  it("classifies owned, partial, and subrent rows", () => {
    const reqs: LiveEquipmentRequirement[] = [
      { id: "a", label: "LED wall", quantity: 1, priority: "required", categoryHint: "LED" },
      {
        id: "b",
        label: "Wireless microphones",
        quantity: 12,
        priority: "required",
        categoryHint: "Audio",
      },
      {
        id: "c",
        label: "24' × 16' stage",
        quantity: 1,
        priority: "required",
        categoryHint: "Staging",
      },
      {
        id: "d",
        label: "Digital audio console",
        quantity: 1,
        priority: "required",
        categoryHint: "Audio",
      },
    ];
    const result = matchEquipmentRequirements(reqs, catalog);
    expect(result.rows.find((r) => r.requirementId === "a")?.status).toBe("owned");
    expect(result.rows.find((r) => r.requirementId === "b")?.status).toBe("partial");
    expect(result.rows.find((r) => r.requirementId === "c")?.status).toBe("subrent");
    expect(result.rows.find((r) => r.requirementId === "d")?.status).toBe("owned");
    expect(result.matchPct).toBeGreaterThan(0);
    expect(result.subRentalSummary?.toLowerCase()).toContain("stage");
  });
});
