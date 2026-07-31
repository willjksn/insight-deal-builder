import { describe, expect, it } from "vitest";
import {
  buildSceneCoverageChecklists,
  mergeSceneCoverageChecklists,
  resolveCoverageTemplateId,
  syncCoverageChecklistWithShots,
} from "@/lib/production/sceneCoverageChecklist";

describe("resolveCoverageTemplateId", () => {
  it("uses five-shot when detailed shot list is off", () => {
    expect(
      resolveCoverageTemplateId({
        detailedShotList: false,
        brief: { contentType: "short_film", castSize: "two", mood: "dramatic" },
      })
    ).toBe("five_shot");
  });

  it("uses product for commercial / social", () => {
    expect(
      resolveCoverageTemplateId({
        detailedShotList: true,
        brief: { contentType: "commercial", castSize: "two", mood: "warm_natural" },
      })
    ).toBe("product");
  });

  it("uses dialogue for two-hander drama", () => {
    expect(
      resolveCoverageTemplateId({
        detailedShotList: true,
        brief: { contentType: "short_film", castSize: "two", mood: "dramatic" },
      })
    ).toBe("dialogue");
  });

  it("uses horror when mood is horror", () => {
    expect(
      resolveCoverageTemplateId({
        detailedShotList: true,
        brief: { contentType: "short_film", castSize: "two", mood: "horror" },
      })
    ).toBe("horror");
  });
});

describe("buildSceneCoverageChecklists", () => {
  it("builds one checklist per scene", () => {
    const lists = buildSceneCoverageChecklists({
      sceneRefs: ["1", "2"],
      sceneHeadings: { "1": "INT. KITCHEN - DAY" },
      detailedShotList: true,
      brief: { contentType: "short_film", castSize: "solo", mood: "dramatic" },
    });
    expect(lists).toHaveLength(2);
    expect(lists[0].templateId).toBe("single_actor");
    expect(lists[0].sceneHeading).toContain("KITCHEN");
    expect(lists[0].items.some((i) => i.label.toLowerCase().includes("close-up"))).toBe(true);
  });
});

describe("merge + sync", () => {
  it("preserves done on merge and auto-ticks from shot types", () => {
    const seeded = buildSceneCoverageChecklists({
      sceneRefs: ["1"],
      detailedShotList: false,
      brief: { contentType: "short_film", castSize: "two", mood: "dramatic" },
    });
    seeded[0].items[0].done = true;
    const merged = mergeSceneCoverageChecklists(seeded, buildSceneCoverageChecklists({
      sceneRefs: ["1"],
      detailedShotList: false,
      brief: { contentType: "short_film", castSize: "two", mood: "dramatic" },
    }));
    expect(merged[0].items[0].done).toBe(true);

    const synced = syncCoverageChecklistWithShots(merged, [
      {
        id: "s1",
        label: "Wide",
        sceneRef: "1",
        done: true,
        sortOrder: 0,
        shotType: "master_wide",
      },
    ]);
    expect(synced?.[0].items.find((i) => i.id === "wide")?.done).toBe(true);
  });
});
