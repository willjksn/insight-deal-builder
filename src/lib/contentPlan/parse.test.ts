import { describe, expect, it } from "vitest";
import {
  parseContentShots,
  parseCreativeBrief,
  parseScriptLines,
  parseStoryBeats,
} from "@/lib/contentPlan/parse";

describe("contentPlan parse", () => {
  it("parses creative brief", () => {
    const brief = parseCreativeBrief({
      workingTitle: "The First Sip",
      hook: "Exhausted then refresh",
      coreConcept: "Post-workout refresh",
    });
    expect(brief.workingTitle).toBe("The First Sip");
    expect(brief.hook).toContain("Exhausted");
  });

  it("parses beats and shots with howToShoot", () => {
    const beats = parseStoryBeats({
      beats: [
        {
          id: "beat_01",
          startTime: "0:00",
          endTime: "0:03",
          label: "Hook",
          description: "Arrive exhausted",
        },
      ],
    });
    expect(beats).toHaveLength(1);

    const shots = parseContentShots({
      shots: [
        {
          shotNumber: 1,
          shotName: "Approach",
          visualDescription: "Creator walks to fridge",
          movement: "Handheld",
          howToShoot: {
            steps: ["Mount 35mm", "Roll before action"],
            commonMistakes: ["Cutting too early"],
            continuity: ["Same hand"],
          },
          setDesignIdeas: "Warm kitchen, soft morning light, tidy counters",
          setDressing: ["Fruit bowl", "Linen towel"],
        },
      ],
    });
    expect(shots[0]?.howToShoot.steps).toHaveLength(2);
    expect(shots[0]?.status).toBe("planned");
    expect(shots[0]?.setDesignIdeas).toMatch(/kitchen/i);
    expect(shots[0]?.setDressing).toEqual(["Fruit bowl", "Linen towel"]);
  });

  it("parses script lines", () => {
    const lines = parseScriptLines({
      lines: [
        {
          speaker: "STORMI",
          dialogue: "Okay, this is exactly what I needed.",
          delivery: "Natural",
          kind: "direct",
        },
      ],
    });
    expect(lines[0]?.speaker).toBe("STORMI");
  });
});
