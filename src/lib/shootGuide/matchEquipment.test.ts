import { describe, expect, it } from "vitest";
import { EQUIPMENT_CATALOG_PRESETS } from "@/lib/constants/presets";
import { applyEquipmentMatch, bestCatalogMatch, focalMm } from "./matchEquipment";
import { emptyShot } from "./defaults";

const catalog = EQUIPMENT_CATALOG_PRESETS.map((p, i) => ({
  id: `eq-${i}`,
  name: p.name,
  category: p.category,
  brand: p.brand,
  model: p.model,
  active: p.active,
}));

describe("focalMm", () => {
  it("reads mm from mixed labels", () => {
    expect(focalMm("Sirui VP-1 75mm T1.4 Cine")).toBe(75);
    expect(focalMm("100mm")).toBe(100);
  });
});

describe("bestCatalogMatch", () => {
  it("hits the FX3 body", () => {
    const hit = bestCatalogMatch("Sony FX3 Camera Body", catalog, "Camera");
    expect(hit?.name).toMatch(/FX3/);
  });

  it("picks the closest owned prime for a 100mm ideal", () => {
    const hit = bestCatalogMatch("100mm", catalog, "Lens");
    expect(hit?.name).toMatch(/75mm|150mm/);
    expect(focalMm(hit?.name || "")).toBe(75);
  });
});

describe("applyEquipmentMatch", () => {
  it("links catalog ids and writes a substitution for a missing gimbal generation", () => {
    const shot = {
      ...emptyShot(1),
      camera: "Sony FX3 Camera Body",
      lens: "100mm",
      support: "DJI RS 4 Pro Gimbal",
    };
    const { shots, plan } = applyEquipmentMatch([shot], catalog, { useMyEquipment: true });
    expect(shots[0].cameraId).toBeTruthy();
    expect(shots[0].lensId).toBeTruthy();
    expect(plan.items.some((i) => i.category === "Lens" && i.adjustment)).toBe(true);
    expect(plan.items.find((i) => i.category === "Support")?.ownedMatch).toMatch(/RS 3 Pro|Gimbal/);
    expect((plan.summary || "").toLowerCase()).toMatch(/owned|substitut/);
  });
});
