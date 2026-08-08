import { describe, expect, it } from "vitest";
import {
  RESOLVE_HANDOFF_REL_DIR,
  buildHandoffFileMap,
  buildResolveCompanionPython,
  resolveHandoffAbsoluteDir,
} from "@/lib/aiEditor/resolveBridge";

describe("resolveBridge", () => {
  it("resolves handoff dir under project root", () => {
    expect(resolveHandoffAbsoluteDir("C:\\Projects\\Show").replace(/\//g, "\\")).toBe(
      `C:\\Projects\\Show\\${RESOLVE_HANDOFF_REL_DIR.replace(/\//g, "\\")}`
    );
  });

  it("builds companion python that links media bin then imports EDL + markers", () => {
    const py = buildResolveCompanionPython({ timelineName: "Rough Cut" });
    expect(py).toContain("DaVinciResolveScript");
    expect(py).toContain("ImportTimelineFromFile");
    expect(py).toContain("ImportMedia");
    expect(py).toContain("AddMarker");
    expect(py).toContain("shootspine_edit_plan.json");
    expect(py).toContain("ShootSpine");
    expect(py).toContain("shootspine_rough_cut.edl");
    expect(py).toContain("Rough Cut");
  });

  it("builds full handoff file map including Mac notes, edit plan, and optional looks", () => {
    const files = buildHandoffFileMap({
      projectId: "p1",
      timelineName: "Cut",
      edl: "TITLE: x\n",
      manifestJson: "{}",
      editPlanJson: '{"version":1,"markers":[]}',
      readme: "readme",
      looksGuide: "Warm look notes",
    });
    expect(Object.keys(files)).toEqual(
      expect.arrayContaining([
        "shootspine_rough_cut.edl",
        "shootspine_handoff.json",
        "shootspine_edit_plan.json",
        "README_RESOLVE.txt",
        "LOOKS.txt",
        "import_shootspine_edl.py",
        "OPEN_ON_MAC.txt",
      ])
    );
    expect(files["OPEN_ON_MAC.txt"]).toContain("Mac");
    expect(files["LOOKS.txt"]).toContain("Warm");
    expect(files["shootspine_edit_plan.json"]).toContain("markers");
  });
});
