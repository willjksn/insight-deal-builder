import { describe, expect, it } from "vitest";
import type { ContentShot } from "@/lib/contentPlan/types";
import type { ProductionDay } from "@/lib/production/types";
import {
  SHOOT_MODE_NOTE_MARKER,
  applyContentPlanShootProgressToDays,
  buildShootProgressNote,
  mergeShootProgressNotes,
  parseShootProgressFromNotes,
} from "@/lib/contentPlan/syncShootProgressToBoard";

function planShot(partial: Partial<ContentShot> & Pick<ContentShot, "id" | "shotNumber">): ContentShot {
  return {
    shotName: "Shot",
    storyPurpose: "",
    startTime: "",
    endTime: "",
    estimatedDuration: "",
    visualDescription: "",
    shotSize: "medium",
    movement: "static",
    howToShoot: { steps: [], commonMistakes: [], continuity: [] },
    status: "planned",
    ...partial,
  };
}

function day(shots: ProductionDay["shots"]): ProductionDay {
  return {
    id: "day1",
    label: "Day 1",
    sortOrder: 0,
    shots,
  };
}

describe("buildShootProgressNote", () => {
  it("includes takes and notes under marker", () => {
    const note = buildShootProgressNote(
      planShot({
        id: "s1",
        shotNumber: 1,
        takesCompleted: [2, 1],
        shootNotes: "Need cleaner slate",
      })
    );
    expect(note).toContain(SHOOT_MODE_NOTE_MARKER);
    expect(note).toContain("Takes: 1, 2");
    expect(note).toContain("Need cleaner slate");
  });

  it("returns undefined when empty", () => {
    expect(buildShootProgressNote(planShot({ id: "s1", shotNumber: 1 }))).toBeUndefined();
  });
});

describe("parseShootProgressFromNotes", () => {
  it("extracts takes and shoot notes from marker block", () => {
    const parsed = parseShootProgressFromNotes(
      `DP: soft key\n\n${SHOOT_MODE_NOTE_MARKER}\nTakes: 1, 3\nNeed cleaner slate`
    );
    expect(parsed.hasShootModeBlock).toBe(true);
    expect(parsed.takes).toEqual([1, 3]);
    expect(parsed.shootNotes).toBe("Need cleaner slate");
    expect(parsed.otherNotes).toBe("DP: soft key");
  });

  it("treats plain notes as otherNotes", () => {
    const parsed = parseShootProgressFromNotes("Just a note");
    expect(parsed.hasShootModeBlock).toBe(false);
    expect(parsed.otherNotes).toBe("Just a note");
  });
});

describe("mergeShootProgressNotes", () => {
  it("replaces prior Shoot Mode block", () => {
    const first = mergeShootProgressNotes("DP: soft key", `${SHOOT_MODE_NOTE_MARKER}\nTakes: 1`);
    const second = mergeShootProgressNotes(first, `${SHOOT_MODE_NOTE_MARKER}\nTakes: 1, 2`);
    expect(second).toContain("DP: soft key");
    expect(second).toContain("Takes: 1, 2");
    expect(second?.match(new RegExp(SHOOT_MODE_NOTE_MARKER, "g"))?.length).toBe(1);
  });
});

describe("applyContentPlanShootProgressToDays", () => {
  it("marks done by contentPlanShotId and never unsets", () => {
    const days = [
      day([
        {
          id: "b1",
          label: "1",
          done: false,
          sortOrder: 0,
          contentPlanShotId: "shot_01",
          scoutShotNumber: 1,
        },
        {
          id: "b2",
          label: "2",
          done: true,
          sortOrder: 1,
          contentPlanShotId: "shot_02",
          scoutShotNumber: 2,
        },
      ]),
    ];
    const { days: next, updatedCount } = applyContentPlanShootProgressToDays(days, [
      planShot({ id: "shot_01", shotNumber: 1, status: "completed", takesCompleted: [1] }),
      planShot({ id: "shot_02", shotNumber: 2, status: "planned" }),
    ]);
    expect(updatedCount).toBeGreaterThanOrEqual(1);
    expect(next[0]?.shots[0]?.done).toBe(true);
    expect(next[0]?.shots[1]?.done).toBe(true);
    expect(next[0]?.shots[0]?.notes).toContain("Takes: 1");
  });

  it("matches by scoutShotNumber when contentPlanShotId missing", () => {
    const days = [
      day([
        {
          id: "b1",
          label: "3",
          done: false,
          sortOrder: 0,
          scoutShotNumber: 3,
        },
      ]),
    ];
    const { days: next } = applyContentPlanShootProgressToDays(days, [
      planShot({
        id: "shot_03",
        shotNumber: 3,
        status: "completed",
        shootNotes: "Wrapped",
      }),
    ]);
    expect(next[0]?.shots[0]?.done).toBe(true);
    expect(next[0]?.shots[0]?.contentPlanShotId).toBe("shot_03");
    expect(next[0]?.shots[0]?.notes).toContain("Wrapped");
  });
});
