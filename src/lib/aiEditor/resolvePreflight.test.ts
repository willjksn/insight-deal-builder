import { describe, expect, it } from "vitest";
import { buildResolvePreflightTips } from "@/lib/aiEditor/resolvePreflight";
import { emptyTimeline } from "@/lib/aiEditor/timeline";

describe("resolvePreflight", () => {
  it("asks for a cut when timeline is missing", () => {
    const tips = buildResolvePreflightTips({});
    expect(tips[0]?.id).toBe("need_cut");
  });

  it("flags unsaved look and open checklist items", () => {
    const timeline = emptyTimeline({ projectId: "p1", name: "Cut" });
    const tips = buildResolvePreflightTips({
      timeline,
      checklist: {
        items: [
          {
            id: "1",
            kind: "missing_shot",
            severity: "action",
            label: "Pickup insert",
            done: false,
          },
        ],
        updatedAt: "",
      },
      settings: {
        id: "p1",
        projectId: "p1",
        createdAt: "",
        updatedAt: "",
        editNotes: [
          {
            id: "n1",
            source: "client",
            text: "Keep product hero longer",
            createdAt: "",
          },
        ],
      },
    });
    expect(tips.some((t) => t.id === "save_look")).toBe(true);
    expect(tips.some((t) => t.id === "open_checklist")).toBe(true);
    expect(tips.some((t) => t.id === "notes_in_brief")).toBe(true);
  });
});
