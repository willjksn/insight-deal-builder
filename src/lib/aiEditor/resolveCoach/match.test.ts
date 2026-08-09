import { describe, expect, it } from "vitest";
import { RESOLVE_COACH_SECTIONS } from "@/lib/aiEditor/resolveCoach/guide";
import { matchResolveCoachQuery, listResolveCoachSections } from "@/lib/aiEditor/resolveCoach/match";
import { RESOLVE_COACH_PAGES } from "@/lib/aiEditor/resolveCoach/types";

describe("resolveCoach guide", () => {
  it("covers every Resolve bottom page plus project", () => {
    const pages = new Set(RESOLVE_COACH_SECTIONS.map((s) => s.page));
    for (const p of RESOLVE_COACH_PAGES) {
      expect(pages.has(p.id), `missing page ${p.id}`).toBe(true);
    }
  });

  it("has beginner through advanced content", () => {
    const levels = new Set(RESOLVE_COACH_SECTIONS.map((s) => s.level));
    expect(levels.has("beginner")).toBe(true);
    expect(levels.has("intermediate")).toBe(true);
    expect(levels.has("advanced")).toBe(true);
  });

  it("uses unique section ids", () => {
    const ids = RESOLVE_COACH_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("matchResolveCoachQuery", () => {
  it("routes transition asks to the edit transitions section", () => {
    const hits = matchResolveCoachQuery("how do I add a transition");
    expect(hits[0]?.section.id).toBe("edit-transitions");
  });

  it("routes color / grade asks to color page", () => {
    const hits = matchResolveCoachQuery("first color pass white balance");
    expect(hits[0]?.section.page).toBe("color");
  });

  it("routes photo/stills to media import", () => {
    const hits = matchResolveCoachQuery("import photos stills");
    expect(hits[0]?.section.id).toBe("media-import-clips");
  });

  it("can scope to a single page", () => {
    const hits = matchResolveCoachQuery("export", { page: "deliver" });
    expect(hits.every((h) => h.section.page === "deliver")).toBe(true);
    expect(hits.length).toBeGreaterThan(0);
  });

  it("lists sections for browse", () => {
    const edit = listResolveCoachSections("edit");
    expect(edit.every((s) => s.page === "edit")).toBe(true);
    expect(edit.length).toBeGreaterThan(2);
  });
});
