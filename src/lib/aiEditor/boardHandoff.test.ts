import { describe, expect, it } from "vitest";
import {
  AI_EDITOR_NOTES_END,
  AI_EDITOR_NOTES_START,
  formatNextShootHandoffBlock,
  mergeFilmingNotesWithHandoff,
} from "@/lib/aiEditor/boardHandoff";
import type { NextShootChecklist } from "@/lib/aiEditor/types";

const checklist: NextShootChecklist = {
  updatedAt: "2026-08-08T12:00:00.000Z",
  sourceTimelineName: "Grade v2",
  items: [
    {
      id: "1",
      kind: "missing_shot",
      severity: "action",
      label: "Pick up missing coverage: Insert shelf",
      done: false,
    },
    {
      id: "2",
      kind: "insight",
      severity: "suggest",
      label: "Done item",
      done: true,
    },
  ],
};

describe("boardHandoff", () => {
  it("formats open items only by default", () => {
    const block = formatNextShootHandoffBlock(checklist);
    expect(block).toContain(AI_EDITOR_NOTES_START);
    expect(block).toContain("Insert shelf");
    expect(block).not.toContain("Done item");
    expect(block).toContain(AI_EDITOR_NOTES_END);
  });

  it("replaces an existing AI Editor section", () => {
    const prior = mergeFilmingNotesWithHandoff(
      "Crew call 7am\n\n" + formatNextShootHandoffBlock(checklist),
      formatNextShootHandoffBlock({
        ...checklist,
        items: [
          {
            id: "3",
            kind: "missing_shot",
            severity: "action",
            label: "Pick up: New insert",
            done: false,
          },
        ],
      })
    );
    expect(prior).toContain("Crew call 7am");
    expect(prior).toContain("New insert");
    expect(prior).not.toContain("Insert shelf");
    expect(prior.indexOf(AI_EDITOR_NOTES_START)).toBe(
      prior.lastIndexOf(AI_EDITOR_NOTES_START)
    );
  });
});
