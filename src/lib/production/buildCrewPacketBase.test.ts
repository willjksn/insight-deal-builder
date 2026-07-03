import { describe, expect, it } from "vitest";
import { buildMasterShots, locationFromSceneHeading } from "@/lib/production/buildCrewPacketBase";
import { ProductionDay } from "@/lib/production/types";
import { ScriptDocument } from "@/lib/scriptWriter/types";

describe("locationFromSceneHeading", () => {
  it("parses INT/EXT headings", () => {
    expect(locationFromSceneHeading("INT. KITCHEN - NIGHT")).toBe("KITCHEN");
    expect(locationFromSceneHeading("EXT. STREET - NIGHT")).toBe("STREET");
  });
});

describe("buildMasterShots", () => {
  const day: ProductionDay = {
    id: "d1",
    title: "Day 1",
    dayNumber: 1,
    scenes: [],
    schedule: [],
    shots: [
      {
        id: "s1",
        label: "1. Wide establishing",
        done: false,
        sortOrder: 0,
        scoutShotNumber: 1,
        sceneRef: "1",
        shotType: "master_wide",
        shotName: "Wide establishing",
        subjectAction: "Empty street at night",
        notes: "Cool moonlight · 24mm",
      },
    ],
  };

  const script: ScriptDocument = {
    title: "Test",
    logline: "A test",
    fountain: "INT. KITCHEN - NIGHT",
    scenes: [
      {
        sceneNumber: "1",
        heading: "EXT. STREET - NIGHT",
        action: "Empty street.",
        dialogue: [],
      },
    ],
    characters: [],
    suggestedShots: [
      {
        sceneNumber: "1",
        shotNumber: 1,
        shotType: "master_wide",
        shotName: "Wide establishing",
        description: "Empty street",
        subjectAction: "Empty street at night",
        lighting: "Cool moonlight",
      },
    ],
  };

  it("builds rows from day shots with script context", () => {
    const rows = buildMasterShots(day, script);
    expect(rows).toHaveLength(1);
    expect(rows[0].location).toBe("STREET");
    expect(rows[0].lightingNotes).toBe("Cool moonlight");
  });

  it("handles numeric scene numbers from AI script JSON", () => {
    const numericScript = {
      ...script,
      scenes: [{ ...script.scenes[0], sceneNumber: 1 as unknown as string }],
      suggestedShots: [{ ...script.suggestedShots[0], sceneNumber: 1 as unknown as string }],
    };
    expect(() => buildMasterShots(day, numericScript)).not.toThrow();
    expect(buildMasterShots(day, numericScript)[0].location).toBe("STREET");
  });
});
